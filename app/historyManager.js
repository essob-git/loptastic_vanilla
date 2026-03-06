/**
 * LopTastic – Community Edition
 * Projektmanagement-Tool
 * Copyright (c) 2025 Sven Bosse
 *
 * Dieses Programm ist freie Software: Sie können es unter den Bedingungen
 * der GNU Affero General Public License, Version 3, wie von der
 * Free Software Foundation veröffentlicht, weitergeben und/oder ändern.
 *
 * Dieses Programm wird in der Hoffnung verteilt, dass es nützlich ist,
 * jedoch OHNE JEDE GEWÄHRLEISTUNG – sogar ohne die implizite Gewährleistung
 * der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK.
 * Weitere Details finden Sie in der GNU Affero General Public License.
 *
 * Sie sollten eine Kopie der GNU Affero General Public License zusammen mit
 * diesem Programm erhalten haben. Wenn nicht, siehe <https://www.gnu.org/licenses/>.
 *
 * Kommerzielle Lizenzen sind auf Anfrage erhältlich.
 * Kontakt: essob-git@outlook.com
 *
 * Hinweis:
 * - Externe Bibliotheken behalten ihre eigenen Lizenzen.
 */

import { StateManager } from './stateManager.js';
import { formatDate } from './utils.js'
import { UIManager } from './uiManager.js';
import { ItemManager } from './itemManager.js';
import { SettingsManager } from './settingsManager.js';
import { DebugLogger } from './debugLogger.js';

function prettyPrintField(field, value) {
    if (field === 'dependencies') {
        if (Array.isArray(value)) {
            return value.map(dep =>
                `[${dep.id}]${dep.kind ? ' (' + dep.kind + ')' : ''}` +
                (dep.lag && dep.lag.value ? ` +${dep.lag.value} ${dep.lag.unit || ''}` : '')
            ).join(', ');
        }
        return value ? JSON.stringify(value) : '-';
    }
    if (field === 'estimated_duration' && value && typeof value === 'object') {
        return value.value ? `${value.value} ${value.unit || ''}` : '-';
    }
    if (value && typeof value === 'object') {
        return JSON.stringify(value);
    }
    return value || '-';
}

 function prettyPrintField2(field, value, allItemsFlat) {
    if (field === 'dependencies') {
        if (Array.isArray(value)) {
            return value.map(dep => {
                const ref = allItemsFlat?.find(it => it.id === dep.id);
                const label = ref
                    ? `[${ref.data.report_id || ''}] ${ref.data.report_topic || ''}`
                    : `[${dep.id}]`;
                const kind = dep.kind ? ` (${dep.kind})` : '';
                const lag = (dep.lag && dep.lag.value)
                    ? ` ${dep.lag.value > 0 ? '+' : ''}${dep.lag.value} ${dep.lag.unit || ''}`
                    : '';
                return `${label}${kind}${lag}`;
            }).join(', ');
        }
        return value ? JSON.stringify(value) : '-';
    }
    if (field === 'estimated_duration' && value && typeof value === 'object') {
        return value.value ? `${value.value} ${value.unit || ''}` : '-';
    }
    if (value && typeof value === 'object') {
        return JSON.stringify(value);
    }
    return value || '-';
}

    let forceLogging = false;

export const HistoryManager = {
isForceLogging() { return forceLogging; },

    async logChange(itemId, action, changes) {
        // Wenn Planspiel aktiv UND kein Force-Logging → überspringen
        if (StateManager.isPlanModeActive() && !forceLogging) return;

        const project = StateManager.getCurrentProject();
        if (!project) {
            DebugLogger.warn("HistoryManager.logChange: Kein aktuelles Projekt.");
            return;
        }

        const timestamp = new Date().toISOString();
        const user = await SettingsManager.ensureUserName();
        const logEntry = { timestamp, user, action, changes };

        // 🧠 Direkt ins Projekt schreiben (keine Kopie!)
        if (!project.changelog[itemId]) {
            project.changelog[itemId] = [];
        }
        project.changelog[itemId].push(logEntry);

        // sicherstellen, dass StateManager davon weiß
        //StateManager.setCurrentProject(project);

        const state = StateManager._getInternalState?.() || StateManager.__stateRef;
        if (state) {
        state.currentProject = project;
        }

        DebugLogger.log("📝 History-Eintrag hinzugefügt:", logEntry);
    },


async forceLogChange(itemId, action, changes) {
  try {
    DebugLogger.log("⚙️ forceLogChange start", { itemId, forceLogging });
    forceLogging = true;
    DebugLogger.log("⚙️ forceLogging gesetzt:", forceLogging);
    await this.logChange(itemId, action, changes);
    DebugLogger.log("✅ forceLogChange done", { forceLogging });
  } finally {
    forceLogging = false;
    DebugLogger.log("🔁 forceLogging reset:", forceLogging);
  }
},


    loadHistoryForList(listId) {
        const project = StateManager.getCurrentProject();
        const historyContent = document.getElementById('history-content');
        historyContent.innerHTML = '';
        
        if (!project || !project.changelog || !listId) return;
        
        // Sammle alle Änderungen für diese Liste
        const listHistory = [];
        const list = project.lists[listId];
        
        if (!list) return;
        
        const collectItemHistory = (items) => {
            items.forEach(item => {
                if (project.changelog[item.id]) {
                    listHistory.push(...project.changelog[item.id].map(entry => ({
                        ...entry,
                        itemId: item.id,
                        itemTopic: item.data.report_topic
                    })));
                }
                if (item.children) {
                    collectItemHistory(item.children);
                }
            });
        };
        
        collectItemHistory(list.items);
        
        // Sortiere nach Datum (neueste zuerst)
        listHistory.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp));
        
        // Zeige die letzten 20 Einträge an
        listHistory.slice(0, 20).forEach(entry => {
            const entryEl = document.createElement('div');
            entryEl.className = 'history-entry';
            
            let changeText = '';
            const itemRef = `<strong>"${entry.itemTopic}"</strong>`;
            
            switch (entry.action) {
                case 'CREATE':
                    changeText = `Eintrag ${itemRef} erstellt`;
                    break;
                case 'UPDATE':
                    changeText = Object.entries(entry.changes)
                        .map(([field, [oldVal, newVal]]) => 
                            `${field}: "${oldVal}" → "${newVal}"`)
                        .join(', ');
                    changeText = `Änderungen an ${itemRef}: ${changeText}`;
                    break;
                case 'DELETE':
                    changeText = `Eintrag ${itemRef} gelöscht`;
                    break;
               /** case 'MOVE':
                    changeText = `Position von ${itemRef} geändert`;
                    break;**/
                case 'MOVE': {
                    const { position, targetItemId, groupSize } = entry.changes || {};
                    const targetRef = targetItemId ? ` → Ziel: ${targetItemId}` : ' → Ziel: (Root)';
                    const groupInfo = groupSize && groupSize > 1 ? ` (Gruppe: ${groupSize} Elemente)` : '';
                    changeText = `Verschoben (${position})${targetRef}${groupInfo}`;
                    break;
                }
            }
            
            entryEl.innerHTML = `
                <div class="d-flex justify-content-between">
                    <div><strong>${formatDate(entry.timestamp)}</strong></div>
                    <div><small>${entry.user}</small></div>
                </div>
                <div class="mt-1">${changeText}</div>
            `;
            historyContent.appendChild(entryEl);
        });
        
        if (listHistory.length === 0) {
            historyContent.innerHTML = '<div class="text-muted text-center py-3">Keine Änderungen aufgezeichnet</div>';
        }
    },
	
	showItemHistory(itemId) {
	const project = StateManager.getCurrentProject();
	if (!project || !project.changelog[itemId]) return;

	//const history = project.changelog[itemId];
    
    const history = (project.changelog[itemId] || []).slice().sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
	//const list = StateManager.getCurrentList();

const list = StateManager.getCurrentList();
const allItemsFlat = list ? (function flatten(items) {
    let r = [];
    items.forEach(it => {
        r.push(it);
        if (it.children && it.children.length > 0) r = r.concat(flatten(it.children));
    });
    return r;
})(list.items) : [];

    
	const item = list ? ItemManager.findItemById(list.items, itemId) : null;
	const topic = item?.data?.report_topic || '(ohne Titel)';


    const fieldTranslator = {
    report_id:      "ID",
    report_date:    "Datum",
    report_topic:   "Thema",
    report_desc:    "Beschreibung",
    report_responsible: "Verantwortlich",
    report_deadline: "Frist",
    report_typ:     "Typ",
    report_status:  "Status",
    
    };

	const historyHtml = history.map(entry => {
		const timestamp = formatDate(entry.timestamp);
		const user = entry.user;

		let changeContent = '';

		switch (entry.action) {
			case 'CREATE':
				changeContent = `<div>Eintrag erstellt</div>`;
				break;

			case 'UPDATE':


let rows = '';

for (const [field, val] of Object.entries(entry.changes)) {
    if (field === 'reason') {
        // Grund als eigene Zeile
        rows += `
            <tr>
                <td><code>Grund</code></td>
                <td colspan="2">${val}</td>
            </tr>
        `;
    } else if (Array.isArray(val)) {
        const [oldVal, newVal] = val;
        rows += `
            <tr>
                <td><code>${fieldTranslator[field] || field}</code></td>
                <td>${prettyPrintField2(field, oldVal, allItemsFlat)}</td>
                <td>${prettyPrintField2(field, newVal, allItemsFlat)}</td>
            </tr>
        `;
    }
}

				changeContent = `
					<div>Änderungen:</div>
					<table class="table table-sm table-bordered mt-1">
						<thead>
							<tr><th width="20%">Feld</th><th width="40%">Vorher</th><th width="40%">Neuer Wert</th></tr>
						</thead>
						<tbody>${rows}</tbody>
					</table>
				`;
				break;

			case 'DELETE':
				changeContent = `<div>Eintrag gelöscht</div>`;
				break;

			case 'MOVE':
				changeContent = `<div>Position geändert</div>`;
				break;
		}

		return `
			<div class="history-entry mb-4 p-2 border rounded bg-light-subtle">
				<div class="d-flex justify-content-between">
					<strong>${timestamp}</strong>
					<small>${user}</small>
				</div>
				<div class="mt-2">${changeContent}</div>
			</div>
		`;
	}).join('');

	const content = history.length === 0
		? '<div class="text-muted text-center py-3">Keine Änderungen vorhanden</div>'
		: `<h5 class="mb-3">Verlauf zu: ${topic}</h5>${historyHtml}`;

	UIManager.showModal("Verlauf anzeigen", content, null, 'lg');
}


	
};