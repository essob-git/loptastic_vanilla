import { StateManager } from './stateManager.js';
import { UIManager } from './uiManager.js';

const ONE_DAY = 24 * 60 * 60 * 1000;
const CLOSED_STATUS_KEYWORDS = ['erledigt', 'abgeschlossen', 'done', 'closed', 'verworfen', 'abgebrochen', 'cancelled', 'storniert'];

function flattenItems(items = [], listId = null, listName = '', acc = []) {
    items.forEach(item => {
        acc.push({ ...item, __listId: listId, __listName: listName });
        if (Array.isArray(item.children) && item.children.length > 0) {
            flattenItems(item.children, listId, listName, acc);
        }
    });
    return acc;
}

function normalizeStatus(status) {
    return String(status || '').trim().toLowerCase();
}

function isClosedStatus(status) {
    const s = normalizeStatus(status);
    return CLOSED_STATUS_KEYWORDS.some(key => s.includes(key));
}

function isTaskItem(item) {
    return item && !item.isDeleted && item.type === 'p';
}

function parseDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = new Date(raw + 'T00:00:00');
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const germanDate = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(raw);
    if (germanDate) {
        const d = new Date(Number(germanDate[3]), Number(germanDate[2]) - 1, Number(germanDate[1]));
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const monthMap = {
        januar: 0, jan: 0,
        februar: 1, feb: 1,
        maerz: 2, märz: 2, mar: 2,
        april: 3, apr: 3,
        mai: 4,
        juni: 5, jun: 5,
        juli: 6, jul: 6,
        august: 7, aug: 7,
        september: 8, sep: 8,
        oktober: 9, okt: 9,
        november: 10, nov: 10,
        dezember: 11, dez: 11
    };

    const monthYear = /^([A-Za-zÄÖÜäöüß.]+)\s+(\d{4})$/.exec(raw);
    if (monthYear) {
        const monthName = monthYear[1].replace('.', '').toLowerCase();
        const month = monthMap[monthName];
        if (month !== undefined) {
            const year = Number(monthYear[2]);
            const d = new Date(year, month + 1, 0);
            return Number.isNaN(d.getTime()) ? null : d;
        }
    }

    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

function getLagDays(dep) {
    if (!dep?.lag?.value) return 0;
    const v = Number(dep.lag.value) || 0;
    const unit = dep.lag.unit || 'd';
    if (unit === 'w') return v * 7;
    if (unit === 'm') return v * 30;
    if (unit === 'y') return v * 365;
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
    return entries.slice(0, 100);
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


function supportsWebGPU() {
    return !!(navigator && navigator.gpu);
}

function isWebGPUUnsupportedError(err) {
    const msg = String(err?.message || err || '').toLowerCase();
    return msg.includes('webgpu is not supported') || msg.includes('webgpu') && msg.includes('not supported');
}

function isOutOfMemoryError(err) {
    const msg = String(err?.message || err || '').toLowerCase();
    return msg.includes('not enough memory') || msg.includes('out of memory') || msg.includes('allocation') && msg.includes('failed');
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
        this.webllmUnavailableReason = null;
        this.webllmDisabledForSession = false;
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
        const allLists = StateManager.getAllLists2().filter(list => list && !list.meta?.isDeleted);
        const allItems = allLists.flatMap(list => flattenItems(list.items || [], list.meta?.id, list.meta?.name || 'Unbenannte Liste'));
        const taskItems = allItems.filter(isTaskItem);
        const itemMap = new Map(taskItems.map(item => [item.id, item]));
        const history = summarizeHistory(project?.changelog || {}, itemMap);

        return { project, allLists, allItems, taskItems, itemMap, history };
    }

    deriveDeadline(item, itemMap, memo = new Map(), visiting = new Set()) {
        if (memo.has(item.id)) return memo.get(item.id);
        if (visiting.has(item.id)) return null;
        visiting.add(item.id);

        let own = parseDate(item.data?.report_deadline);
        const deps = Array.isArray(item.data?.dependencies) ? item.data.dependencies : [];
        const predecessorDates = [];

        deps.forEach(dep => {
            const pred = itemMap.get(dep.id);
            if (!pred) return;

            const predDate = this.deriveDeadline(pred, itemMap, memo, visiting) || parseDate(pred.data?.report_deadline);
            if (!predDate) return;
            const shifted = new Date(predDate.getTime() + getLagDays(dep) * ONE_DAY);
            predecessorDates.push(shifted);
        });

        if (!own && predecessorDates.length > 0) {
            own = new Date(Math.max(...predecessorDates.map(d => d.getTime())));
        }

        visiting.delete(item.id);
        memo.set(item.id, own || null);
        return own || null;
    }

    async analyzeSchedule() {
        const { taskItems, itemMap, allLists } = this.collectContext();
        const findings = [];
        const now = new Date();
        const derivedMemo = new Map();

        if (!allLists.length) {
            return [{ severity: 'info', message: 'Keine aktive Liste im Projekt gefunden.' }];
        }

        taskItems.forEach(item => {
            const idLabel = item.data?.report_id ? `[${item.data.report_id}] ` : '';
            const topic = `${idLabel}${item.data?.report_topic || 'Ohne Titel'} (${item.__listName || 'Liste'})`;
            const explicitDeadline = parseDate(item.data?.report_deadline);
            const effectiveDeadline = explicitDeadline || this.deriveDeadline(item, itemMap, derivedMemo);
            const closed = isClosedStatus(item.data?.report_status);

            if (!effectiveDeadline) {
                findings.push({ severity: 'warn', message: `Fehlende/ungültige Frist bei ${topic}` });
            } else if (effectiveDeadline < now && !closed) {
                findings.push({
                    severity: 'error',
                    message: `Überfälliger offener Termin bei ${topic} (Frist: ${item.data?.report_deadline || effectiveDeadline.toISOString().slice(0, 10)})`
                });
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

                const predecessorDeadline = parseDate(predecessor.data?.report_deadline) || this.deriveDeadline(predecessor, itemMap, derivedMemo);
                if (effectiveDeadline && predecessorDeadline) {
                    const minStart = new Date(predecessorDeadline.getTime() + getLagDays(dep) * ONE_DAY);
                    if (effectiveDeadline < minStart) {
                        findings.push({
                            severity: 'error',
                            message: `Terminlogik verletzt: ${topic} liegt vor dem zulässigen Termin nach Vorgänger ${predecessor.data?.report_topic || predecessor.id}`
                        });
                    }
                }
            });
        });

        findings.push(...this.detectCycles(taskItems));

        if (this.engine === 'tfjs') {
            const tf = await tryLoadTensorFlow();
            if (tf) {
                findings.push(...this.tfRiskHints(taskItems, tf));
            } else {
                findings.push({ severity: 'info', message: 'TensorFlow.js nicht verfügbar – Regelanalyse wurde genutzt.' });
            }
        }

        if (!findings.length) {
            findings.push({ severity: 'ok', message: 'Keine Unstimmigkeiten gefunden.' });
        }
        return findings;
    }

    detectCycles(taskItems) {
        const map = new Map(taskItems.map(item => [item.id, item]));
        const visited = new Set();
        const stack = new Set();
        const findings = [];

        const dfs = (id, path = []) => {
            if (stack.has(id)) {
                findings.push({ severity: 'error', message: `Zyklische Verkettung erkannt: ${[...path, id].join(' -> ')}` });
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

        taskItems.forEach(item => dfs(item.id));
        return findings;
    }

    tfRiskHints(taskItems, tf) {
        const durations = taskItems.map(i => Number(i.data?.estimated_duration?.value || 0)).filter(Boolean);
        if (durations.length < 3) return [];

        const tensor = tf.tensor1d(durations);
        const mean = tensor.mean().arraySync();
        const std = tf.moments(tensor).variance.sqrt().arraySync() || 1;
        tensor.dispose();

        const hints = [];
        taskItems.forEach(item => {
            const duration = Number(item.data?.estimated_duration?.value || 0);
            if (!duration) return;
            const z = (duration - mean) / std;
            if (Math.abs(z) > 2.2) {
                hints.push({ severity: 'warn', message: `Auffällige Dauer (TensorFlow-Ausreißer): ${item.data?.report_topic || item.id} mit ${duration}` });
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
            if (this.webllmDisabledForSession) {
                return `${this.webllmUnavailableReason || 'WebLLM ist für diese Sitzung deaktiviert.'}

Antwort aus lokalem Regelmodus:
${this.ruleBasedAnswer(question, context)}`;
            }

            if (!supportsWebGPU()) {
                this.webllmUnavailableReason = 'WebLLM benötigt WebGPU (nicht WebGL). In dieser Umgebung ist WebGPU nicht verfügbar.';
                this.webllmDisabledForSession = true;
                UIManager.showToast('WebLLM nicht verfügbar (WebGPU fehlt) – nutze Regelmodus.', 'warning');
                return `${this.webllmUnavailableReason}

Antwort aus lokalem Regelmodus:
${this.ruleBasedAnswer(question, context)}`;
            }

            try {
                const webllm = await tryLoadWebLLM();
                if (webllm) {
                    if (!this.webllmEngine) {
                        this.webllmEngine = await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC');
                    }
                    const prompt = this.buildPrompt(question, context);
                    const result = await this.webllmEngine.chat.completions.create({ messages: [{ role: 'user', content: prompt }] });
                    return result.choices?.[0]?.message?.content || 'Keine Antwort verfügbar.';
                }
            } catch (err) {
                const webgpuIssue = isWebGPUUnsupportedError(err);
                const oomIssue = isOutOfMemoryError(err);
                this.webllmUnavailableReason = webgpuIssue
                    ? 'WebLLM-Start fehlgeschlagen: Browser unterstützt hier kein WebGPU. WebGL v1/v2 allein reicht für WebLLM nicht aus.'
                    : oomIssue
                        ? 'WebLLM-Start fehlgeschlagen: Nicht genug GPU-Speicher verfügbar. Entscheidend ist primär VRAM (z. B. auf der T1000), nicht nur CPU/RAM.'
                        : `WebLLM-Start fehlgeschlagen: ${err?.message || err}`;
                this.webllmDisabledForSession = true;
                console.warn(this.webllmUnavailableReason, err);
                UIManager.showToast('WebLLM Fehler – nutze Regelmodus.', 'warning');
                return `${this.webllmUnavailableReason}

Antwort aus lokalem Regelmodus:
${this.ruleBasedAnswer(question, context)}`;
            }

            this.webllmUnavailableReason = 'WebLLM konnte nicht geladen werden (CDN/Import fehlgeschlagen).';
            this.webllmDisabledForSession = true;
            UIManager.showToast('WebLLM nicht ladbar – nutze Regelmodus.', 'warning');
            return `${this.webllmUnavailableReason}

Antwort aus lokalem Regelmodus:
${this.ruleBasedAnswer(question, context)}`;
        }
        return this.ruleBasedAnswer(question, context);
    }

    buildPrompt(question, context) {
        const items = context.taskItems.slice(0, 140).map(item => ({
            id: item.id,
            list: item.__listName,
            report_id: item.data?.report_id,
            topic: item.data?.report_topic,
            deadline: item.data?.report_deadline,
            status: item.data?.report_status,
            deps: item.data?.dependencies || []
        }));

        const history = context.history.slice(0, 60).map(h => ({
            timestamp: h.timestamp,
            user: h.user,
            action: h.action,
            itemId: h.itemId,
            topic: h.topic,
            changes: h.changes
        }));

        return `Du bist der LopTastic KI-Assistent. Antworte auf Deutsch, präzise und nachvollziehbar. Berücksichtige Statuslogik: erledigt, verworfen, abgebrochen sind i.d.R. nicht kritisch bei überfälligen Fristen.\n\nFrage:\n${question}\n\nProjektkontext (JSON):\n${JSON.stringify({ items, history }, null, 2)}\n\nWenn du Inkonsistenzen siehst, benenne sie klar mit Item- und Listenbezug.`;
    }

    ruleBasedAnswer(question, context) {
        const q = question.toLowerCase();

        if (q.includes('überfällig') || q.includes('deadline') || q.includes('frist')) {
            const overdue = context.taskItems.filter(item => {
                const d = parseDate(item.data?.report_deadline) || this.deriveDeadline(item, context.itemMap);
                if (!d) return false;
                return d < new Date() && !isClosedStatus(item.data?.report_status);
            });

            if (!overdue.length) return 'Es gibt aktuell keine überfälligen offenen Termine.';
            return `Überfällige offene Termine (${overdue.length}):\n- ` + overdue.slice(0, 15).map(i => `${i.data?.report_topic || i.id} [${i.__listName}] (Frist: ${i.data?.report_deadline || 'abgeleitet'})`).join('\n- ');
        }

        if (q.includes('verkett') || q.includes('abhäng')) {
            const withDeps = context.taskItems.filter(i => Array.isArray(i.data?.dependencies) && i.data.dependencies.length > 0);
            if (!withDeps.length) return 'Es sind keine Verkettungen/Abhängigkeiten definiert.';
            return `Es gibt ${withDeps.length} Elemente mit Verkettungen. Beispiele:\n` + withDeps.slice(0, 10).map(i => {
                const deps = i.data.dependencies.map(d => d.id).join(', ');
                return `- ${i.data?.report_topic || i.id} [${i.__listName}]: ${deps}`;
            }).join('\n');
        }

        if (q.includes('liste') || q.includes('listen')) {
            const byList = new Map();
            context.taskItems.forEach(item => {
                const key = item.__listName || 'Unbekannt';
                byList.set(key, (byList.get(key) || 0) + 1);
            });
            return `Ich sehe ${context.allLists.length} aktive Listen:\n- ` + [...byList.entries()].map(([name, count]) => `${name}: ${count} Aufgaben`).join('\n- ');
        }

        const hits = context.taskItems.filter(i => {
            const t = (i.data?.report_topic || '').toLowerCase();
            const d = (i.data?.report_desc || '').toLowerCase();
            return t.includes(q) || d.includes(q);
        });

        if (hits.length > 0) {
            return `Ich habe ${hits.length} passende Elemente gefunden:\n- ` + hits.slice(0, 12).map(i => `${i.data?.report_topic || i.id} [${i.__listName}] (${i.data?.report_deadline || 'keine Frist'})`).join('\n- ');
        }

        const latestChanges = context.history.slice(0, 8).map(h => `${h.timestamp}: ${h.action} – ${h.topic}`).join('\n');
        return `Keine direkte Zuordnung zur Frage. Letzte Änderungen:\n${latestChanges || 'Keine Historie verfügbar.'}`;
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
