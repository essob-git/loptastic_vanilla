import { StateManager } from './stateManager.js';
import { UIManager } from './uiManager.js';

const ONE_DAY = 24 * 60 * 60 * 1000;

function flattenItems(items = [], listId = null, acc = []) {
    items.forEach(item => {
        acc.push({ ...item, __listId: listId });
        if (Array.isArray(item.children) && item.children.length > 0) {
            flattenItems(item.children, listId, acc);
        }
    });
    return acc;
}

function parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function getLagDays(dep) {
    if (!dep?.lag?.value) return 0;
    const v = Number(dep.lag.value) || 0;
    const unit = dep.lag.unit || 'd';
    if (unit === 'w') return v * 7;
    if (unit === 'm') return v * 30;
    return v;
}

function summarizeHistory(changelog = {}, itemMap = new Map()) {
    const entries = [];
    Object.entries(changelog).forEach(([itemId, logs]) => {
        (logs || []).forEach(log => {
            entries.push({
                ...log,
                itemId,
                topic: itemMap.get(itemId)?.data?.report_topic || 'Unbekannt'
            });
        });
    });

    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return entries.slice(0, 50);
}

async function tryLoadWebLLM() {
    try {
        const mod = await import('https://esm.run/@mlc-ai/web-llm');
        return mod;
    } catch (err) {
        console.warn('WebLLM konnte nicht geladen werden:', err);
        return null;
    }
}

async function tryLoadTensorFlow() {
    if (window.tf) return window.tf;
    try {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        return window.tf || null;
    } catch (err) {
        console.warn('TensorFlow.js konnte nicht geladen werden:', err);
        return null;
    }
}

class LoptasticAIAssistant {
    constructor() {
        this.engine = 'rules';
        this.webllmEngine = null;
        this.isBusy = false;
    }

    async init() {
        this.bindUi();
    }

    bindUi() {
        const runBtn = document.getElementById('ai-run-analysis');
        const askBtn = document.getElementById('ai-ask-btn');
        const input = document.getElementById('ai-question-input');
        const engineSelect = document.getElementById('ai-engine-select');

        engineSelect?.addEventListener('change', (e) => {
            this.engine = e.target.value;
        });

        runBtn?.addEventListener('click', async () => {
            const findings = await this.analyzeSchedule();
            this.renderFindings(findings);
        });

        askBtn?.addEventListener('click', async () => {
            const question = (input?.value || '').trim();
            if (!question) return;
            await this.ask(question);
        });

        input?.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const question = (input.value || '').trim();
                if (!question) return;
                await this.ask(question);
            }
        });
    }

    collectContext() {
        const project = StateManager.getCurrentProject();
        const allLists = StateManager.getAllLists2();
        const allItems = allLists.flatMap(list => flattenItems(list.items || [], list.meta?.id));
        const itemMap = new Map(allItems.map(item => [item.id, item]));
        const history = summarizeHistory(project?.changelog || {}, itemMap);

        return { project, allLists, allItems, itemMap, history };
    }

    async analyzeSchedule() {
        const { allItems, itemMap } = this.collectContext();
        const findings = [];
        const now = new Date();

        allItems.forEach(item => {
            const idLabel = item.data?.report_id ? `[${item.data.report_id}] ` : '';
            const topic = `${idLabel}${item.data?.report_topic || 'Ohne Titel'}`;
            const deadline = parseDate(item.data?.report_deadline);
            const status = (item.data?.report_status || '').toLowerCase();

            if (!deadline) {
                findings.push({ severity: 'warn', message: `Fehlende Frist bei ${topic}` });
            } else if (deadline < now && !status.includes('abgeschlossen') && !status.includes('done')) {
                findings.push({ severity: 'error', message: `Überfälliger Termin bei ${topic} (${item.data.report_deadline})` });
            }

            const deps = Array.isArray(item.data?.dependencies) ? item.data.dependencies : [];
            deps.forEach(dep => {
                if (dep.id === item.id) {
                    findings.push({ severity: 'error', message: `Selbstabhängigkeit erkannt bei ${topic}` });
                    return;
                }

                const predecessor = itemMap.get(dep.id);
                if (!predecessor) {
                    findings.push({ severity: 'error', message: `Ungültige Verkettung: ${topic} verweist auf nicht vorhandenes Element ${dep.id}` });
                    return;
                }

                const predecessorDeadline = parseDate(predecessor.data?.report_deadline);
                if (deadline && predecessorDeadline) {
                    const minStart = new Date(predecessorDeadline.getTime() + getLagDays(dep) * ONE_DAY);
                    if (deadline < minStart) {
                        findings.push({
                            severity: 'error',
                            message: `Terminlogik verletzt: ${topic} liegt vor/zu nah am Vorgänger ${predecessor.data?.report_topic || predecessor.id}`
                        });
                    }
                }
            });
        });

        const cycleFindings = this.detectCycles(allItems);
        findings.push(...cycleFindings);

        if (this.engine === 'tfjs') {
            const tf = await tryLoadTensorFlow();
            if (tf) {
                const tfHints = this.tfRiskHints(allItems, tf);
                findings.push(...tfHints);
            } else {
                findings.push({ severity: 'info', message: 'TensorFlow.js nicht verfügbar – Regelanalyse wurde genutzt.' });
            }
        }

        if (findings.length === 0) {
            findings.push({ severity: 'ok', message: 'Keine Unstimmigkeiten gefunden.' });
        }

        return findings;
    }

    detectCycles(allItems) {
        const map = new Map(allItems.map(item => [item.id, item]));
        const visited = new Set();
        const stack = new Set();
        const findings = [];

        const dfs = (id, path = []) => {
            if (stack.has(id)) {
                findings.push({
                    severity: 'error',
                    message: `Zyklische Verkettung erkannt: ${[...path, id].join(' -> ')}`
                });
                return;
            }
            if (visited.has(id)) return;
            visited.add(id);
            stack.add(id);

            const item = map.get(id);
            const deps = Array.isArray(item?.data?.dependencies) ? item.data.dependencies : [];
            deps.forEach(dep => {
                if (map.has(dep.id)) dfs(dep.id, [...path, id]);
            });
            stack.delete(id);
        };

        allItems.forEach(item => dfs(item.id));
        return findings;
    }

    tfRiskHints(allItems, tf) {
        const durations = allItems.map(i => Number(i.data?.estimated_duration?.value || 0)).filter(Boolean);
        if (durations.length < 3) return [];

        const tensor = tf.tensor1d(durations);
        const mean = tensor.mean().arraySync();
        const std = tf.moments(tensor).variance.sqrt().arraySync() || 1;
        tensor.dispose();

        const hints = [];
        allItems.forEach(item => {
            const duration = Number(item.data?.estimated_duration?.value || 0);
            if (!duration) return;
            const z = (duration - mean) / std;
            if (Math.abs(z) > 2.2) {
                hints.push({
                    severity: 'warn',
                    message: `Auffällige Dauer (TensorFlow-Ausreißer): ${item.data?.report_topic || item.id} mit ${duration}`
                });
            }
        });

        return hints;
    }

    async ask(question) {
        if (this.isBusy) return;
        this.isBusy = true;

        const answerEl = document.getElementById('ai-answer-output');
        const input = document.getElementById('ai-question-input');
        answerEl.textContent = 'Denke nach ...';

        try {
            const context = this.collectContext();
            const answer = await this.generateAnswer(question, context);
            answerEl.textContent = answer;
            if (input) input.value = '';
        } catch (err) {
            console.error(err);
            answerEl.textContent = `Fehler bei der Antwortgenerierung: ${err.message}`;
            UIManager.showToast('KI-Assistent Fehler', 'error');
        } finally {
            this.isBusy = false;
        }
    }

    async generateAnswer(question, context) {
        if (this.engine === 'webllm') {
            const webllm = await tryLoadWebLLM();
            if (webllm) {
                if (!this.webllmEngine) {
                    this.webllmEngine = await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC');
                }
                const prompt = this.buildPrompt(question, context);
                const result = await this.webllmEngine.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }]
                });
                return result.choices?.[0]?.message?.content || 'Keine Antwort verfügbar.';
            }
        }

        return this.ruleBasedAnswer(question, context);
    }

    buildPrompt(question, context) {
        const items = context.allItems.slice(0, 120).map(item => ({
            id: item.id,
            report_id: item.data?.report_id,
            topic: item.data?.report_topic,
            deadline: item.data?.report_deadline,
            status: item.data?.report_status,
            deps: item.data?.dependencies || []
        }));

        const history = context.history.slice(0, 40).map(h => ({
            timestamp: h.timestamp,
            user: h.user,
            action: h.action,
            itemId: h.itemId,
            topic: h.topic,
            changes: h.changes
        }));

        return `Du bist der LopTastic KI-Assistent. Antworte auf Deutsch, präzise und nachvollziehbar.

Frage:\n${question}

Projektkontext (JSON):\n${JSON.stringify({ items, history }, null, 2)}

Wenn du Inkonsistenzen siehst, benenne sie klar mit Item-Bezug.`;
    }

    ruleBasedAnswer(question, context) {
        const q = question.toLowerCase();
        if (q.includes('überfällig') || q.includes('deadline') || q.includes('frist')) {
            const overdue = context.allItems.filter(item => {
                const d = parseDate(item.data?.report_deadline);
                if (!d) return false;
                const done = (item.data?.report_status || '').toLowerCase().includes('abgeschlossen');
                return d < new Date() && !done;
            });

            if (overdue.length === 0) return 'Es gibt aktuell keine überfälligen offenen Termine.';
            return `Überfällige offene Termine (${overdue.length}):\n- ` + overdue
                .slice(0, 12)
                .map(i => `${i.data?.report_topic || i.id} (Frist: ${i.data?.report_deadline || '—'})`)
                .join('\n- ');
        }

        if (q.includes('verkett') || q.includes('abhäng')) {
            const withDeps = context.allItems.filter(i => Array.isArray(i.data?.dependencies) && i.data.dependencies.length > 0);
            if (!withDeps.length) return 'Es sind keine Verkettungen/Abhängigkeiten definiert.';
            return `Es gibt ${withDeps.length} Elemente mit Verkettungen. Beispiel:\n` + withDeps.slice(0, 8).map(i => {
                const deps = i.data.dependencies.map(d => d.id).join(', ');
                return `- ${i.data?.report_topic || i.id}: ${deps}`;
            }).join('\n');
        }

        const hits = context.allItems.filter(i => {
            const t = (i.data?.report_topic || '').toLowerCase();
            const d = (i.data?.report_desc || '').toLowerCase();
            return t.includes(q) || d.includes(q);
        });

        if (hits.length > 0) {
            return `Ich habe ${hits.length} passende Elemente gefunden:\n- ` + hits.slice(0, 10).map(i => {
                const deadline = i.data?.report_deadline || 'keine Frist';
                return `${i.data?.report_topic || i.id} (${deadline})`;
            }).join('\n- ');
        }

        const latestChanges = context.history.slice(0, 8).map(h => `${h.timestamp}: ${h.action} – ${h.topic}`).join('\n');
        return `Ich konnte keine direkte Zuordnung zur Frage finden. Letzte Änderungen:\n${latestChanges || 'Keine Historie verfügbar.'}`;
    }

    renderFindings(findings) {
        const output = document.getElementById('ai-analysis-output');
        if (!output) return;

        output.innerHTML = findings.map(f => {
            const cls = f.severity === 'error' ? 'danger' : f.severity === 'warn' ? 'warning' : f.severity === 'ok' ? 'success' : 'secondary';
            return `<div class="alert alert-${cls} py-2 px-3 mb-2">${f.message}</div>`;
        }).join('');
    }
}

export const AIAssistantManager = new LoptasticAIAssistant();
