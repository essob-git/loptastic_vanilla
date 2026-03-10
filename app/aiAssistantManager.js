import { StateManager } from './stateManager.js';
import { UIManager } from './uiManager.js';

const ONE_DAY = 24 * 60 * 60 * 1000;
const CLOSED_STATUS_KEYWORDS = ['erledigt', 'abgeschlossen', 'done', 'closed', 'verworfen', 'abgebrochen', 'cancelled', 'storniert'];
const QUESTION_STOPWORDS = new Set([
    'was', 'ist', 'sind', 'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'einer', 'eines', 'und', 'oder', 'mit', 'von', 'zu', 'im', 'in', 'am', 'an',
    'für', 'fuer', 'bei', 'auf', 'über', 'ueber', 'wie', 'welche', 'welcher', 'welches', 'gibt', 'es', 'mir', 'bitte', 'zeige', 'zeig', 'alle', 'zur', 'zum', 'des'
]);

function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9äöüß\s-]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function extractKeywords(question) {
    return normalizeText(question)
        .split(' ')
        .map(t => t.trim())
        .filter(t => t.length >= 3 && !QUESTION_STOPWORDS.has(t));
}

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
    return entries;
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

async function tryLoadWebLLM() {
    try {
        return await import('https://esm.run/@mlc-ai/web-llm');
    } catch (err) {
        console.warn('WebLLM konnte nicht geladen werden:', err);
        return null;
    }
}



class LoptasticAIAssistant {
    constructor() {
        this.engine = 'webllm';
        this.isBusy = false;
        this.tfBackend = null;
        this.webllmEngine = null;
        this.webllmModel = null;
        this.webllmDisabledReason = null;
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
        console.info("project: ", project.manifest.project.name);
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
            predecessorDates.push(new Date(predDate.getTime() + getLagDays(dep) * ONE_DAY));
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
                findings.push({ severity: 'error', message: `Überfälliger offener Termin bei ${topic}` });
            }

            const deps = Array.isArray(item.data?.dependencies) ? item.data.dependencies : [];
            deps.forEach(dep => {
                if (dep.id === item.id) {
                    findings.push({ severity: 'error', message: `Selbstabhängigkeit erkannt bei ${topic}` });
                    return;
                }

                const predecessor = itemMap.get(dep.id);
                if (!predecessor) {
                    findings.push({ severity: 'error', message: `Ungültige Verkettung: ${topic} -> ${dep.id}` });
                    return;
                }

                const predecessorDeadline = parseDate(predecessor.data?.report_deadline) || this.deriveDeadline(predecessor, itemMap, derivedMemo);
                if (effectiveDeadline && predecessorDeadline) {
                    const minStart = new Date(predecessorDeadline.getTime() + getLagDays(dep) * ONE_DAY);
                    if (effectiveDeadline < minStart) {
                        findings.push({ severity: 'error', message: `Terminlogik verletzt: ${topic} vor Vorgänger ${predecessor.data?.report_topic || predecessor.id}` });
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
                findings.push({ severity: 'info', message: 'TensorFlow.js nicht verfügbar – Regelanalyse aktiv.' });
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
                findings.push({ severity: 'error', message: `Zyklische Verkettung: ${[...path, id].join(' -> ')}` });
                return;
            }
            if (visited.has(id)) return;
            visited.add(id);
            stack.add(id);

            const item = map.get(id);
            const deps = Array.isArray(item?.data?.dependencies) ? item.data.dependencies : [];
            deps.forEach(dep => map.has(dep.id) && dfs(dep.id, [...path, id]));
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
                hints.push({ severity: 'warn', message: `Auffällige Dauer: ${item.data?.report_topic || item.id} (${duration})` });
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

    async initWebLLMEngine() {
        if (this.webllmEngine) return this.webllmEngine;
        if (this.webllmDisabledReason) return null;

        const webllm = await tryLoadWebLLM();
        if (!webllm) {
            this.webllmDisabledReason = 'WebLLM konnte nicht geladen werden (Import/CDN).';
            return null;
        }

        // Sehr kleines/robustes Fallback-Modell
        const modelCandidates = [
            'Qwen2.5-0.5B-Instruct-q4f32_1-MLC'
        ];

        for (const model of modelCandidates) {
            try {
                this.webllmEngine = await webllm.CreateMLCEngine(model);
                this.webllmModel = model;
                this.webllmDisabledReason = null;
                UIManager.showToast(`WebLLM aktiv (${model})`, 'success');
                return this.webllmEngine;
            } catch (err) {
                console.warn(`WebLLM Modell ${model} fehlgeschlagen:`, err);
            }
        }

        this.webllmDisabledReason = 'WebLLM konnte nicht gestartet werden: kein kompatibles Q4-Modell verfügbar.';
        return null;
    }

buildWebLLMPrompt(question, context) {
    const keywords = extractKeywords(question);

    const rankedItems = (context.taskItems || [])
        .map(item => {
            const hay = normalizeText([
                item.data?.report_id,
                item.data?.report_topic,
                item.data?.report_desc,
                item.data?.report_responsible,
                item.data?.report_status,
                item.__listName
            ].join(' '));

            let score = 0;
            for (const k of keywords) {
                if (hay.includes(k)) score += 2;
                if (normalizeText(item.data?.report_topic).includes(k)) score += 1;
            }

            return { item, score };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(x => x.item);

    const fallbackItems = (context.taskItems || []).slice(0, 5);
    const selectedItems = rankedItems.length ? rankedItems : fallbackItems;

    const compactLines = selectedItems.map((item, idx) =>
        `${idx + 1}. Thema: ${item.data?.report_topic || '-'} | ` +
        `ID: ${item.data?.report_id || '-'} | ` +
        `Status: ${item.data?.report_status || '-'} | ` +
        `Frist: ${item.data?.report_deadline || '-'} | ` +
        `Verantwortlich: ${item.data?.report_responsible || '-'} | ` +
        `Liste: ${item.__listName || '-'}`
    );

    const historyLines = (context.history || [])
        .slice(0, 4)
        .map(h => `${h.timestamp}: ${h.action} - ${h.topic}`);

    let prompt =
`Projekt: ${context.project?.manifest?.project?.name || context.project?.manifest?.name || 'Unbekannt'}

Relevante Einträge:
${compactLines.length ? compactLines.join('\n') : 'Keine relevanten Einträge gefunden.'}

Letzte Änderungen:
${historyLines.length ? historyLines.join('\n') : 'Keine Historie verfügbar.'}

Frage: ${question}

Antworte kurz, klar und nur in Klartext auf Deutsch.`;

    const MAX_PROMPT_LEN = 8000;
    if (prompt.length > MAX_PROMPT_LEN) {
        prompt = prompt.slice(0, MAX_PROMPT_LEN) + '\n\n[Kontext gekürzt]';
    }

    return prompt;
}

    async generateAnswer(question, context) {

         const q = normalizeText(question);
            if (
                q.includes('überfällig') ||
                q.includes('ueberfaellig') ||
                q.includes('deadline') ||
                q.includes('frist')
            ) {
                return this.ruleBasedAnswer(question, context);
            }


        if (this.engine === 'webllm') {
            const engine = await this.initWebLLMEngine();
            if (engine) {
                const prompt = this.buildWebLLMPrompt(question, context);
                try {
                    const result = await engine.chat.completions.create({
                        messages: [
                            {
                                role: 'system',
                                content: 'Du bist ein Projektassistent. Antworte immer kurz, präzise und auf Deutsch. Gib niemals JSON, niemals den Prompt und niemals den Kontext zurück.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.2
                    });
                    let llm = result?.choices?.[0]?.message?.content?.trim();
                    if (llm) {
                      const looksLikePromptEcho =
                                                        llm.startsWith('{') ||
                                                        llm.startsWith('[') ||
                                                        llm.startsWith('```json') ||
                                                        llm.startsWith('Kontext JSON') ||
                                                        llm.startsWith('Projekt:') ||
                                                        llm.includes('Relevante Einträge:') ||
                                                        llm.includes('Frage:');

                                                    if (looksLikePromptEcho) {
                                                        llm = this.ruleBasedAnswer(question, context);
                                                    }
                        return `${llm}

[WebLLM: ${this.webllmModel || 'aktiv'}]`;
                    }
                } catch (err) {
                    console.warn('WebLLM Antwort fehlgeschlagen, fallback auf Regeln:', err);
                    UIManager.showToast('WebLLM Antwort fehlgeschlagen – nutze Regelmodus.', 'warning');
                }
            } else {
                UIManager.showToast((this.webllmDisabledReason || 'WebLLM nicht verfügbar') + ' – nutze Regelmodus.', 'warning');
            }
        }

        if (this.engine === 'tfjs') {
            const tf = await tryLoadTensorFlow();
            if (tf && !this.tfBackend && tf.getBackend) this.tfBackend = tf.getBackend();
        }

        return this.ruleBasedAnswer(question, context);
    }

    ruleBasedAnswer(question, context) {
        const q = normalizeText(question);
        const keywords = extractKeywords(question);
        const items = context.taskItems || [];

        const overdue = items.filter(item => {
            const d = parseDate(item.data?.report_deadline) || this.deriveDeadline(item, context.itemMap);
            if (!d) return false;
            return d < new Date() && !isClosedStatus(item.data?.report_status);
        });

        if (q.includes('überfällig') || q.includes('ueberfaellig') || q.includes('deadline') || q.includes('frist')) {
            if (!overdue.length) return 'Es gibt aktuell keine überfälligen offenen Termine.';
            return `Überfällige offene Termine (${overdue.length}):\n- ` + overdue.slice(0, 15).map(i => `${i.data?.report_topic || i.id} [${i.__listName}] (Frist: ${i.data?.report_deadline || 'abgeleitet'})`).join('\n- ');
        }

        const ranked = items.map(item => {
            const hay = normalizeText([
                item.data?.report_id,
                item.data?.report_topic,
                item.data?.report_desc,
                item.data?.report_responsible,
                item.data?.report_status,
                item.__listName
            ].join(' '));

            let score = 0;
            keywords.forEach(k => {
                if (hay.includes(k)) score += 2;
                if (normalizeText(item.data?.report_topic).includes(k)) score += 1;
            });
            return { item, score };
        }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);

        const top = ranked.slice(0, 8).map(r => r.item);
        if (top.length) {
            return `Ich habe ${ranked.length} passende Einträge gefunden:\n- ` + top.map(i => `${i.data?.report_topic || i.id} [${i.__listName}] | Frist: ${i.data?.report_deadline || 'keine Frist'} | Status: ${i.data?.report_status || 'kein Status'}`).join('\n- ');
        }

        const latestChanges = context.history.slice(0, 8).map(h => `${h.timestamp}: ${h.action} – ${h.topic}`).join('\n');
        return `Ich konnte keine direkten Treffer finden. Letzte Änderungen:\n${latestChanges || 'Keine Historie verfügbar.'}`;
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
