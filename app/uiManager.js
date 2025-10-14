/**
 * Listify – Community Edition
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

import { StateManager, formatDate } from './app.js';
import { ListManager } from './listManager.js';
import { ItemManager,resolveParentHeadlines, findSuccessors, calcAutoDeadline,calcAutoDeadlineDeep, calcAutoDeadlineDetails, calcEarliestStart, calcLatestStart} from './itemManager.js';
import { SnapshotManager2 } from './snapshotManager2.js';
import { HistoryManager } from './historyManager.js';
import { SettingsManager } from './settingsManager.js';
import { renderDashboard } from './dashboard.js';
import { HelperManager } from './helperManager.js';
import { CommentManager } from './commentManager.js';
import { formatGermanDate } from './utils.js';



let _phasesCache = null;


export const PhaseHelper = {
    async init() {
        if (!_phasesCache) {
            _phasesCache = await SettingsManager.getConfigObject("lists_phase");
            console.log("Geladene Phasen:", _phasesCache);
        }
    },

    getPhaseName(phaseCode) {
        if (!_phasesCache) return "Unbekannte Phase";
        const key = String(phaseCode).trim();
        return _phasesCache[key] || "Unbekannte Phase";
    }
};
/**
 * Sichert den aktuellen Zustand des Item-Editor-Formulars.
 * @returns {Object} Zustand des Formulars
 */

function backupModalFormState() {
    return {
        report_id: document.getElementById('item-id')?.value,
        report_topic: document.getElementById('item-topic')?.value,
        report_desc: document.getElementById('item-desc')?.value,
        report_responsible: document.getElementById('item-responsible')?.value,
        report_deadline: document.getElementById('item-deadline')?.value,
        report_typ: document.getElementById('item-typ')?.value,
        report_status: document.getElementById('item-status')?.value,
        report_date: document.getElementById('item-date')?.value,
        duration_value: document.getElementById('item-duration-value')?.value,
        duration_unit: document.getElementById('item-duration-unit')?.value,
        dependencies: Array.from(document.querySelectorAll('.dependency-entry')).map(entry => ({
            kind: entry.querySelector('.dep-kind')?.value,
            id: entry.querySelector('.dep-select')?.value,
            lagValue: entry.querySelector('.dep-lag')?.value,
            lagUnit: entry.querySelector('.dep-lag-unit')?.value,
        }))
    };
}

/**
 * Stellt einen zuvor gesicherten Zustand im Item-Editor-Formular wieder her.
 * @param {Object} state - Der zu wiederherstellende Zustand
 */
function restoreModalFormState(state, item) {
    if (!state) return;
    document.getElementById('item-id').value = state.report_id || '';calcAutoDeadlineDeep
    document.getElementById('item-topic').value = state.report_topic || '';
    document.getElementById('item-desc').value = state.report_desc || '';
    document.getElementById('item-responsible').value = state.report_responsible || '';
    document.getElementById('item-deadline').value = state.report_deadline || '';
    document.getElementById('item-typ').value = state.report_typ || '';
    document.getElementById('item-status').value = state.report_status || '';
    document.getElementById('item-date').value = state.report_date || '';

    //Dauer
    document.getElementById('item-duration-value').value = state.duration_value || '';
    document.getElementById('item-duration-unit').value = state.duration_unit || '';


   // Dependencies zurücksetzen
    document.querySelectorAll('.dependency-entry').forEach((entry, i) => {
        const depState = state.dependencies[i];
        if (depState) {
            entry.querySelector('.dep-kind').value = depState.kind;
            entry.querySelector('.dep-select').value = depState.id;
            entry.querySelector('.dep-lag').value = depState.lagValue;
            entry.querySelector('.dep-lag-unit').value = depState.lagUnit;
        }
    });
}

/**
 * Zeigt einen Bestätigungsdialog an. Rückgabe: true bei Bestätigung, false bei Abbruch.
 * @param {string} title - Titel des Dialogs
 * @param {string} message - Nachricht im Dialog
 * @param {string} [confirmText='Löschen'] - Text des Bestätigungsbuttons
 * @param {string} [cancelText='Abbrechen'] - Text des Abbrechen-Buttons
 * @returns {Promise<boolean>} Ergebnis der Bestätigung
 */
export function showConfirmDialog(title, message, confirmText = 'Löschen', cancelText = 'Abbrechen') {
    return new Promise((resolve) => {
        const modal = new bootstrap.Modal(document.getElementById('mainModal'));
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalBody').innerHTML = message;
        document.getElementById('modalFooter').innerHTML = `
            <button type="button" class="btn btn-danger" id="modal-confirm-btn">${confirmText}</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelText}</button>
        `;
        modal.show();
        document.getElementById('modal-confirm-btn').onclick = () => {
            modal.hide();
            resolve(true);
        };
        document.getElementById('mainModal').addEventListener('hidden.bs.modal', () => resolve(false), { once: true });
    });
}

/**
 * UIManager-Objekt mit allen UI-relevanten Methoden.
 */
export const UIManager = {
	/** Zähler für kritische Deadlines in einer Liste */
    criticalDeadlineCounter: 0,

    /**
     * Initialisiert die UI-Komponenten (Toast, Modal, Filter).
     */
   async init() {
        this.toast = new bootstrap.Toast(document.getElementById('liveToast'));
        this.modal = new bootstrap.Modal(document.getElementById('mainModal'));
        this.renderItemFilter();
        
    },



    showItems() {
        document.getElementById('items-container').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
    },

    showDashboard() {
        document.getElementById('items-container').style.display = 'none';
        const dash = document.getElementById('dashboard-container');
        dash.style.display = 'block';

        // 👉 nur HIER renderDashboard() aufrufen
        dash.innerHTML = renderDashboard();
    },
	/**
     * Rendert die Filter-UI für Items.
     */
    renderItemFilter() {
        const container = document.getElementById('item-filter-container');
        if (!container) return;

        container.innerHTML = `
            <div class="row mb-2">
                <div class="col-md-6 small">
                    <strong>Status-Live-Filter:</strong><br>
                    ${['Erledigt', 'verworfen', 'abgebrochen', 'ausstehend'].map(status => `
                        <div class="form-check form-check-inline">
                            <input class="form-check-input item-filter-status" type="checkbox" value="${status}" id="filter-status-${status}">
                            <label class="form-check-label" for="filter-status-${status}">${status}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="col-md-6 small">
                    <strong>Typ-Live-Filter:</strong><br>
                    ${['Information', 'Entscheidung', 'Aufgabe'].map(typ => `
                        <div class="form-check form-check-inline">
                            <input class="form-check-input item-filter-typ" type="checkbox" value="${typ}" id="filter-typ-${typ}">
                            <label class="form-check-label" for="filter-typ-${typ}">${typ}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const applyBodyClasses = () => {
            const body = document.body;
            // Reset vorherige Filterklassen
            body.className = body.className
                .split(' ')
                .filter(c => !c.startsWith('filter-status-') && !c.startsWith('filter-typ-'))
                .join(' ');

            // Status-Filter
            document.querySelectorAll('.item-filter-status').forEach(cb => {
                const val = cb.value.toLowerCase().replace(/\s+/g, '-');
                if (!cb.checked) {
                    body.classList.add(`filter-status-${val}-hide`);
                }
            });

            // Typ-Filter
            document.querySelectorAll('.item-filter-typ').forEach(cb => {
                const val = cb.value.toLowerCase().replace(/\s+/g, '-');
                if (!cb.checked) {
                    body.classList.add(`filter-typ-${val}-hide`);
                }
            });
        };

        // Event-Listener setzen
        container.querySelectorAll('.item-filter-status, .item-filter-typ').forEach(cb => {
            cb.addEventListener('change', applyBodyClasses);
        });

        // Standard: Alle aktiviert
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    },

	 /**
     * Aktualisiert die Projektinformationen im UI.
     * @param {Object} project - Das Projektobjekt
     */
    updateProjectInfo(project) {
        const container = document.getElementById('project-info');
        if (!project) {
            container.innerHTML = '<div class="alert alert-info">Kein Projekt geladen</div>';
            return;
        }
        
        const { name, description, sapNummer, wNummer, projectLeader } = project.manifest.project;
        container.innerHTML = `
            <h5>${name}</h5>
            ${description ? `<p class="text-muted">${description}</p>` : ''}
            <table class="table table-sm">
                ${sapNummer ? `<tr class="fs-6"><th>SAP Nr.</th><td>${sapNummer}</td></tr>` : ''}
                ${wNummer ? `<tr class="fs-6"><th>W-Nr.</th><td>${wNummer}</td></tr>` : ''}
                ${projectLeader ? `<tr class="fs-6"><th>Projektleiter</th><td>${projectLeader}</td></tr>` : ''}
            </table>
        `;
    },
    
    /**
     * Zeigt die vorhandenen Listen an und sortiert diese nach Aktualität.
     * @param {Object} lists - Listenobjekt
     */	
    updateLists(lists) {
        const container = document.getElementById('lists-container');
        if (!container) {
            console.error("Listen-Container nicht gefunden");
            return;
        }

        container.innerHTML = '';

        if (!lists || Object.keys(lists).length === 0) {
            container.innerHTML = '<div class="text-muted py-3">Keine Listen vorhanden</div>';
            return;
        }

        try {
            // Ungültige Einträge herausfiltern
            const validLists = Object.values(lists).filter(list => list?.meta?.created);
            

            // Sortieren nach Erstellungsdatum (neueste zuerst)
            const sortedLists = validLists.sort((a, b) =>
                new Date(b.meta.updated) - new Date(a.meta.updated)
            );

            // Nur die letzten drei nehmen
            const limitedLists = sortedLists.slice(0, 3);

            // Elemente erzeugen
            limitedLists.forEach(list => {
                const listEl = this.createListElement(list);
                container.appendChild(listEl);
            });

            // Erste Liste aktiv setzen, falls noch keine gewählt
            if (!StateManager.getCurrentList() && limitedLists.length > 0) {
                StateManager.setCurrentList(limitedLists[0]);
                this.highlightSelectedList(limitedLists[0].meta.id);
                this.updateListContent(limitedLists[0]);
                this.updateSnapshotsForList(limitedLists[0].meta.id);
            }
        } catch (error) {
            console.error("Fehler beim Aktualisieren der Listen:", error);
            container.innerHTML = '<div class="alert alert-danger">Fehler beim Laden</div>';
        }
    },

    /**
     * Erzeugt das DOM-Element für eine einzelne Liste.
     * @param {Object} list - Listenobjekt
     * @returns {HTMLElement} Das erzeugte Listenelement
     */	
    createListElement(list) {
        const isCurrent = StateManager.getCurrentList()?.meta.id === list.meta.id;
        const isFinalized = ListManager.isListFinalized(list.meta.id);

        const listEl = document.createElement('div');
		
        listEl.className = `list-item ${isCurrent ? 'active' : ''} ${isFinalized ? 'finalized' : ''}`;
		listEl.dataset.listId = list.meta.id;
		
        console.log ("Phase:",list.meta.phase)
        const phaseLabel = PhaseHelper.getPhaseName(list.meta.phase);

   
		
		listEl.innerHTML = `
            <div class="list-item-header">
                <h5 class="list-title">${list.meta.name}</h5>
                
            </div>
            <div class="list-item-meta">
                <div class="d-flex justify-content-between">
                    <div class="">
                        <small>Änderung: ${formatDate(list.meta.updated || list.meta.created )}</small>


                        
                        ${list.meta.description ? `<p class="list-description">${list.meta.description}</p>` : ''}
                    </div>
                    <div class="">
                        <span class="badge phase-${list.meta.phase}">
                            
                            ${phaseLabel}
                        </span>
                    </div>
                </div>
            <div class="list-item-actions justify-content-end d-none">
                <button class="btn btn-sm btn-outline-danger delete-list">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;


	   listEl.addEventListener('click', (e) => {
			if (e.target.closest('.delete-list')) return;
			StateManager.setCurrentList(list);
			this.highlightSelectedList(list.meta.id);
			this.updateListContent(list); //Liste neu laden
			
			UIManager.updateSnapshotsForList(list.meta.id);
		});

		listEl.querySelector('.delete-list').addEventListener('click', (e) => {
			e.stopPropagation();
			if (confirm(`Liste "${list.meta.name}" wirklich löschen?`)) {
				ListManager.deleteList(list.meta.id);
			}
		});

        return listEl;
    },
	
    /**
     * Hebt die aktuell ausgewählte Liste visuell hervor.
     * @param {string} listId - ID der ausgewählten Liste
     */
    highlightSelectedList(listId) {
        document.querySelectorAll('.list-item').forEach(item => {
            item.classList.toggle('active', item.dataset.listId === listId);
        });
    },

    /**
     * Gibt den Namen der Projektphase zurück.
     * @param {number} phaseCode - Phasen-Code
     * @returns {string} Name der Phase
     */
    /*getPhaseName(phaseCode) {
        const phases = {
            1: 'Projektvorbereitung',
            2: 'Planung',
            3: 'Ausführungsvorbereitung',
            4: 'Ausführung',
            5: 'Projektabschluss',
            10: 'Sonstiges'

        };
        return phases[phaseCode] || 'Unbekannte Phase';
    },*/

    /*async getPhaseName(phaseCode) {
        try {
            const phases = await SettingsManager.getSetting("lists_phase");
            if (!phases) return "Unbekannte Phase";

            // Zugriff: Keys sind Strings → darum String(phaseCode)
            return phases[String(phaseCode)] || "Unbekannte Phase";
        } catch (err) {
            console.error("Fehler beim Laden der Phasen:", err);
            return "Unbekannte Phase";
        }
    },*/
	
    /**
     * Aktualisiert die UI-Inhalte einer Liste.
     * @param {Object} list - Die Liste
     */
     updateListContent(list) {
		
		if (list && !list.__isSnapshot) {
            this.setReadOnlyMode(false);
        }
	
        if (!list) {
            document.getElementById('list-title').textContent = 'Keine Liste ausgewählt';
            document.getElementById('list-description').textContent = '';
            document.getElementById('list-phase').textContent = '';
            document.getElementById('items-container').innerHTML = '';
            return;
        }
        this.criticalDeadlineCounter = 0;
        

        document.getElementById('list-title').textContent = list.meta.name;
        document.getElementById('list-description').textContent = list.meta.description || '';
        document.getElementById('list-phase').textContent = PhaseHelper.getPhaseName(list.meta.phase);
        
        const container = document.getElementById('items-container');
        container.innerHTML = '';
        
        this.renderItems(list.items, container);
        
        // Finalisierungsknopf aktualisieren
        const finalizeBtn = document.getElementById('finalize-list');
        if (list.meta.finalized) {
            finalizeBtn.disabled = true;
            finalizeBtn.innerHTML = '<i class="bi bi-lock-fill"></i> Finalisiert';
        } else {
            finalizeBtn.disabled = false;
            finalizeBtn.innerHTML = '<i class="bi bi-lock"></i> Finalisieren';
        }
        this.updateGlobalDeadlineNotice();

        if (window.CollapseManager) {
        window.CollapseManager.onRender();
        }
    },

    /**
     * Rendert alle Items einer Liste.
     * @param {Array} items - Die Items
     * @param {HTMLElement} container - Container-Element
     * @param {number} [level=0] - Verschachtelungsebene
     */
    renderItems(items, container, level = 0) {
        // Sortiere Elemente nach ihrer Sortierreihenfolge
        const sortedItems = [...items].sort((a, b) => a.sort - b.sort);
        
        sortedItems.forEach(item => {
            if (item.isDeleted) return;
            
            const itemEl = this.createItemElement(item, level);
			
			const existingEl = container.querySelector(`.item-card[data-item-id="${item.id}"]`);
			if (existingEl) return;
			
            container.appendChild(itemEl);
            console.log("Rendering:", item.id, "at level", level);
			const isHeadline = ['h1', 'h2', 'h3'].includes(item.type);
            // Kinder rendern, falls vorhanden
            if (item.children && item.children.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = `children-container child-level-${level} child-item-${item.type}`;
                
                //childrenContainer.style.marginLeft = `${level * 20 + 20}px`;
				//childrenContainer.style.marginLeft = `${(level + 1) * 10}px`; // oder konstant 20px
				
                container.appendChild(childrenContainer);
                this.renderItems(item.children, childrenContainer, level + 1);
            }
        });
    },
    
	/**
     * Erstellt das DOM-Element für ein einzelnes Item.
     * @param {Object} item - Das Item
     * @param {number} level - Verschachtelungsebene
     * @returns {HTMLElement} Das erzeugte Itemelement
     */
    createItemElement(item, level) {
        const itemEl = document.createElement('div');
        itemEl.className = `item-card item-${item.type} card`;
        //Filter
        if (item.type === 'p') {
            const status = (item.data.report_status || '').toLowerCase().replace(/\s+/g, '-');
            const typ = (item.data.report_typ || '').toLowerCase().replace(/\s+/g, '-');
            itemEl.classList.add(`filter-status-${status}`);
            itemEl.classList.add(`filter-typ-${typ}`);
        }

        itemEl.dataset.itemId = item.id;
        //itemEl.draggable = true; 2025-09-23 Fehler: Würde Snapsot Mode überschrieben
        const currentList = StateManager.getCurrentList();
        const isSnapshot = currentList?.__isSnapshot || false;
        itemEl.draggable = !isSnapshot;

        itemEl.style.marginLeft = `${(level + 1) * 10}px`;

		const typeStyles = {
			h1: 'border-left: 4px solid var(--h1-color);',
			h2: 'border-left: 4px solid var(--h2-color);',
			h3: 'border-left: 4px solid var(--h3-color);',
			p:  'border-left: 4px solid var(--p-color);'
		};
		itemEl.style = typeStyles[item.type] || 'border-left: 4px solid #ccc;';
		
        const statusClass = this.getStatusBadgeClass(item.data.report_status || '');
		const isHeadline = ['h1', 'h2', 'h3']. includes(item.type);
		

		
        // Kettenvorgang
        const list = StateManager.getCurrentList();
        const allItemsFlat = list ? (function flatten(items) {
            let r = [];
            items.forEach(it => {
                r.push(it);
                if (it.children && it.children.length > 0) r = r.concat(flatten(it.children));
            });
            return r;
        })(list.items) : [];
        
        const hasPredecessor = Array.isArray(item.data.dependencies) && item.data.dependencies.length > 0;
        const hasSuccessor = allItemsFlat
            .filter(it => it.id !== item.id && Array.isArray(it.data.dependencies))
            .some(it => it.data.dependencies.some(dep => dep.id === item.id));
        const isLinked = hasPredecessor || hasSuccessor;


    // --- NEU: Farbliche Frist-Logik ---
        let deadlineClass = '';
        let deadlineClassLight ='';
        let autoDeadline = '';
        let detailsText = '';
        let startFA = '';
        let startSA = '';
        let transitiveAutoDeadline = '';
        let  deepDeadlineDate = '';
const commentCount = item.comments?.length || 0;
        if (!isHeadline) {
            const userDeadline = item.data.report_deadline;
            autoDeadline = calcAutoDeadline(item, allItemsFlat);
            const details = calcAutoDeadlineDetails(item, allItemsFlat);
            deepDeadlineDate =calcAutoDeadlineDeep(item, allItemsFlat);


            //Frühster Beginn berechnen aus Abhängigkeit
             startFA =  calcEarliestStart(item, allItemsFlat); // Frühster Anfang : Muss aus dem Spätestens Ende der Vorgänger genommen, Offset beachten.
             startSA = calcLatestStart(item); // Spätester Anfang : Wird aus der Deadline des Vorgangs - der Dauer errechnet



            console.log("Details:", details)

            const dateRe = /^\d{2}\.\d{2}\.\d{4}$/;
            if (dateRe.test(userDeadline) && dateRe.test(autoDeadline)) {
               const [d, m, y] = userDeadline.split('.').map(Number);
                const [ad, am, ay] = autoDeadline.split('.').map(Number);
                const userDate = new Date(y, m - 1, d);
                const autoDate = new Date(ay, am - 1, ad);
                /* if (userDate >= autoDate) {
                    deadlineClass = 'text-success';
                }else{
                    deadlineClass = 'deadline-warning text-danger fw-bold';
                     this.criticalDeadlineCounter++; 
                     console.log("criticalDeadlineCounter", this.criticalDeadlineCounter);
                }*/

                // --- Neue Deep-Deadline prüfen ---
                if (deepDeadlineDate instanceof Date && !isNaN(deepDeadlineDate)) {
                    if (userDate >= deepDeadlineDate) {
                        // Falls noch keine Klasse gesetzt, grün
                        if (!deadlineClass) {
                            deadlineClass = 'text-success';
                            deadlineClassLight ='text-success-emphasis';
                        }
                    } else {
                        deadlineClass = 'deadline-warning text-danger fw-bold';
                        deadlineClassLight ='text-danger-emphasis';
                        this.criticalDeadlineCounter++;
                        console.log("criticalDeadlineCounter (deep)", this.criticalDeadlineCounter);
                    }
                }
            }

            
            if (details.vorgaenger && details.vorgaengerDeadline) {
                const vorgaengerLabel = `[${details.vorgaenger.data.report_id}] ${details.vorgaenger.data.report_topic}`;
                let offsetLabel = '';
                if (details.vorgaengerOffset && details.vorgaengerOffset.value) {
                    const mapUnit = { d: 'Tage', w: 'Wochen', m: 'Monate', y: 'Jahre' };
                    let offsetValue = '';
                    if (details.vorgaengerOffset.value > 0) {
                        offsetValue = '+';
                    } else if (details.vorgaengerOffset.value < 0) {
                        offsetValue = '';
                    } else {
                        offsetValue = '';
                    }

                    offsetLabel = ` (inkl. Offset: ${offsetValue}${details.vorgaengerOffset.value} ${mapUnit[details.vorgaengerOffset.unit] || details.vorgaengerOffset.unit})`;
                }
                let dauerLabel = '';
                if (details.eigeneDauer && details.eigeneDauer.value) {
                    const mapUnit = { d: 'Tage', w: 'Wochen', m: 'Monate', y: 'Jahre' };
                    dauerLabel = `, Eigene Dauer: ${details.eigeneDauer.value} ${mapUnit[details.eigeneDauer.unit] || details.eigeneDauer.unit}`;
                }
                detailsText = `
                    <span class="text-muted small">
                        Ende maßgeblicher Vorgänger: <strong>${vorgaengerLabel}</strong> am: <strong>${details.vorgaengerDeadline}</strong>
                        ${offsetLabel}${dauerLabel}
                    </span>
                `;
            }

        }

        
        // --- NEU: P-Elemente ohne Eltern hervorheben ---
        let hasParentClass = '';
        let whatIsParent = '';
        //if (item.type === 'p') {
        if (['h2','h3', 'p'].includes(item.type)) {
            // Prüfe, ob ein echtes Headline-Parent existiert:
            const list = StateManager.getCurrentList();
            const allItemsFlat = list ? (function flatten(items) {
                let r = [];
                items.forEach(it => {
                    r.push(it);
                    if (it.children && it.children.length > 0) r = r.concat(flatten(it.children));
                });
                return r;
            })(list.items) : [];

            let parent = null;
            if (item.parentId) {
                parent = allItemsFlat.find(it => it.id === item.parentId && ['h1', 'h2', 'h3'].includes(it.type));
            }
            if (!parent) {
                // **Ohne Eltern: grau färben**
                hasParentClass = "no-parent"
            }else{
            hasParentClass = '';
            whatIsParent =  `parent-${parent.type}`;
            }
        }


		let innerContent = '';
		
		if (isHeadline) {
			/*innerContent = `
				<div class="d-flex align-items-center mb-1">

					<span class="badge bg-secondary me-2">${item.data.report_id || ''}</span>
					<h5 class="card-title mb-0">${item.data.report_topic || ''}</h5>
                   
				</div>
				${item.data.report_desc ? `<p class="card-text">${item.data.report_desc}</p>` : ''}
			`;*/


            			innerContent = `
				<div class="d-flex align-items-center mb-1">

					<span class="badge bg-secondary me-2">${item.data.report_id || ''}</span>
					<h5 class="card-title mb-0">${item.data.report_topic || ''}</h5>
                   
				</div>
                    ${item.data.report_desc
                    ? `<div class="card-text markdown-desc">${marked.parse(
                            item.data.report_desc,
                            { mangle: false, headerIds: false }
                        )}</div>`
                    : ''}
				
			`;
		} else {
	
			innerContent = `
          
			<div class="table-responsive pr-5">	
             <table class="table table-sm table-bordered mb-0">
					<thead class="thead-dark" style="font-size: 10px">
						<tr>
							<th scope="col" width="100">ID</th>
							<th scope="col" width="150">Datum</th>
							<th scope="col" width="*">Titel / Beschreibung</th>
							<th scope="col" width="100">Verantwortlich</th>
                            <th scope="col" width="80" class="d-none d-md-table-cell">Dauer</th>
							<th scope="col" width="150">Frist</th>
							<th scope="col" width="100">Typ</th>
							<th scope="col" width="100">Status</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><span class="badge bg-secondary me-2">${item.data.report_id || ''}</span></td>
							<td>${item.data.report_date || ''}</td>
							<td><h5 class="card-title mb-0">${item.data.report_topic || ''}</h5>
								<!--${item.data.report_desc ? `<p class="card-text mb-2">${item.data.report_desc}</p>` : ''}-->
                                ${item.data.report_desc
  ? `<div class="card-text mb-2 markdown-desc">${marked.parse(
        item.data.report_desc,
        { mangle: false, headerIds: false }
     )}</div>`
  : ''}
							</td>
							
							<td>${item.data.report_responsible || ''}</td>
                            <td class="d-none d-md-table-cell">${item.data.estimated_duration?.value || ''} ${item.data.estimated_duration?.unit || ''}</td>
							<td class="${deadlineClass || ''}">${item.data.report_deadline || ''}</td>
							<td>${item.data.report_typ|| ''}</td>
							<td><span class="badge ${statusClass}">${item.data.report_status || ''}</span></td>
					</tr>
                    
					 ${(autoDeadline && deadlineClass) || (startFA && startSA) ? `
                    <tr class="table-warning">
                        <td></td>
                        <td><!--<span class="text-muted small text-warning">FA: ${startFA}</span><br>
                            <span class="text-muted small text-danger">SA: ${startSA}</span>--></td>
                        <td colspan="3"><span class="text-muted small text-dark">${detailsText}</span></td>
                   
                        <td><span class="${deadlineClassLight}">FE: ${formatGermanDate(deepDeadlineDate)}</span></td>
                        <td></td>
                        <td></td>
                    </tr>
                    ` : ''}

					</tbody>
				</table>
                </div>
			`;
		}


     
        let colorClass = '';
        let icon = '';
            if (hasSuccessor && hasPredecessor) {
                colorClass = "multi";
                icon = "bi-code";
            }else if(hasSuccessor && !hasPredecessor) {
                colorClass = "successor";
                icon = "bi-chevron-left"
            }else if(!hasSuccessor && hasPredecessor){
                colorClass = "predecessor";
                icon = "bi-chevron-right";
            }else{
                colorClass ="";
            }
        


		  itemEl.innerHTML = `
           
			<div class="card-body ${hasParentClass} ${colorClass}">
				<div class="d-flex justify-content-between align-items-start">
					<div class="flex-grow-1">
						${innerContent}
					</div>
					<div class="${item.type === 'p' ? 'btn-grid-2x2' : 'btn-group'} mx-2">
						<button class="btn btn-sm btn-outline-primary edit-item">
							<i class="bi bi-pencil"></i>
						</button>
						<button class="btn btn-sm btn-outline-danger delete-item">
							<i class="bi bi-trash"></i>
						</button>
						<button class="btn btn-sm btn-outline-secondary history-item" title="Verlauf">
							<i class="bi bi-clock-history"></i>
						</button>
                        <button class="btn btn-sm btn-outline-secondary dependency-item d-none" title="Abhängigkeiten">
                            <i class="bi bi-link-45deg"></i>
                        </button>

                        <button class="btn btn-sm btn-outline-info comment-item ${isHeadline ? 'd-none' : '' } position-relative" title="Kommentare">
                            <i class="bi bi-chat-dots"></i>

                            ${commentCount > 0 ? `
        <span class="position-absolute top-100 start-100 translate-middle badge rounded-pill bg-secondary">
            ${commentCount}
            <span class="visually-hidden">Kommentare</span>
        </span>
    ` : ''}
                        </button>

                    </div>
				</div>
			</div>
		`;
	
       
        //itemEl.draggable = true;
        // Drag-Start: ID in den DataTransfer legen + visuelles Feedback
  
        console.log("Drag?", itemEl.draggable)
        if (!isSnapshot) {
            itemEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.id);
            itemEl.classList.add('dragging');
            // optional: eigenes Drag-Bild
            if (e.dataTransfer.setDragImage) {
                e.dataTransfer.setDragImage(itemEl, 20, 20);
            }
            });

            // Drag-End: Indikatoren wegräumen
            itemEl.addEventListener('dragend', () => {
            itemEl.classList.remove('dragging');
            document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
            });



            // Event-Listener für Drag & Drop
            itemEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.id);
                itemEl.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setDragImage(itemEl, 20, 20);
            });
            
            itemEl.addEventListener('dragend', () => {
                itemEl.classList.remove('dragging');
                document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
            });
            
            itemEl.querySelector('.edit-item').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showItemEditor(item);
                HelperManager.showHelpTo("hilfe-itemlist-editor")
            });
            
            itemEl.querySelector('.delete-item').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Item wirklich löschen?`)) {
                ItemManager.softDeleteItem(item.id);
                }
            });
            itemEl.querySelector('.comment-item').addEventListener('click', (e) => {
                e.stopPropagation();
                console.log("🕒 comment für:", item.id);
                CommentManager.showCommentModal(item.id);
            });
        }

		itemEl.querySelector('.history-item').addEventListener('click', (e) => {
			e.stopPropagation();
			console.log("🕒 Verlauf für:", item.id);
			HistoryManager.showItemHistory(item.id);
		});

        
		
        return itemEl;
    },

    /**
     * Aktualisiert die globale Deadline-Warnung.
     */
    updateGlobalDeadlineNotice() {
        const notice = document.getElementById('readonly-notice');
        if (!notice) return;

        if (this.criticalDeadlineCounter > 0) {
            notice.innerHTML = `
            <div class="alert alert-danger d-flex align-items-center mb-2" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <div>
                <strong>Kritische Fristen:</strong> 
                Mindestens ${this.criticalDeadlineCounter} Vorgang${this.criticalDeadlineCounter === 1 ? '' : 'e'} überschreiten die Frist.
                </div>
            </div>
            `;
        } else {
            notice.innerHTML = '';
        }
    },	

    /**
     * Ermittelt das beste Drop-Ziel im Drag & Drop für einen .children-container.
     * @param {Event} e - Das Event
     * @param {HTMLElement} childrenContainer - Der Container
     * @returns {Object} Drop-Informationen
     */
    resolveDropOnChildrenContainer(e, childrenContainer) {
        const y = e.clientY;
        const cards = Array.from(childrenContainer.querySelectorAll('.item-card'));
        const parentCard = childrenContainer.previousElementSibling?.classList?.contains('item-card')
            ? childrenContainer.previousElementSibling
            : null;
        const parentId = parentCard?.dataset?.itemId || null;

        if (cards.length === 0) {
            // Leerer Container → am Ende der Gruppe einfügen
            return { position: 'into', targetItemId: parentId, indicatorTarget: parentCard || childrenContainer };
        }

        // Nächstliegende Karte nach Maus-Y finden
        let closest = cards[0];
        let after = false;
        let minDelta = Infinity;

        for (const c of cards) {
            const r = c.getBoundingClientRect();
            const mid = r.top + r.height / 2;
            const d = Math.abs(y - mid);
            if (d < minDelta) {
                minDelta = d;
                closest = c;
                after = y > mid;
            }
        }

        return {
            position: after ? 'below' : 'above',
            targetItemId: closest.dataset.itemId,
            indicatorTarget: closest
        };
    },

    /**
     * Initialisiert die Drag & Drop-Container für Items.
     */
    setupDragDropContainers() {
        //Readonly = Snapshot Mode
        


        const container = document.getElementById('drop-container');
        if (!container) return;

        // Doppelbindung vermeiden (statt cloneNode, das Events der Kinder zerstört)
        if (container.dataset.dndBound === '1') return;
        container.dataset.dndBound = '1';

        container.addEventListener('dragover', (e) => {
            // Snapshot Mode
            const currentList = StateManager.getCurrentList();
            if (currentList?.__isSnapshot) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'none';
                return;
            }


            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const itemId = e.dataTransfer.getData('text/plain');
            const targetElement = document.elementFromPoint(e.clientX, e.clientY);

            if (!targetElement || !itemId) return;

            const dropTarget = targetElement.closest('.item-card, .children-container, #drop-container');
            if (!dropTarget) return;

            let position;
            let indicatorTarget = dropTarget;

            if (dropTarget.classList.contains('children-container')) {
                const r = this.resolveDropOnChildrenContainer(e, dropTarget);
                position = r.position;
                // r.targetItemId wäre hier nur for debugging; für den Indikator zählt das Ziel-Element:
                indicatorTarget = r.indicatorTarget;
            } else if (dropTarget.id === 'drop-container') {
                position = 'into'; // Root
            } else {
                const rect = dropTarget.getBoundingClientRect();
                const relY = e.clientY - rect.top;
                    if (relY < rect.height * 0.25) {
                        position = 'above';
                    } else if (relY > rect.height * 0.75) {
                        position = 'below';
                    } else {
                        position = 'into';
                    }
            }

            // Vorherige Indikatoren entfernen und neuen setzen – auf INDICATOR-TARGET!
            document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
            ItemManager.createDropIndicator(indicatorTarget, position);
        });

        container.addEventListener('drop', (e) => {
                    // Snapshot Mode
            const currentList = StateManager.getCurrentList();
            if (currentList?.__isSnapshot) {
                e.preventDefault();
                return;
            }

            e.preventDefault();
            document.querySelectorAll('.drop-indicator').forEach(el => el.remove());

            const itemId = e.dataTransfer.getData('text/plain');
            if (!itemId) return;

            const targetElement = document.elementFromPoint(e.clientX, e.clientY);
            if (!targetElement) return;

            const dropTarget = targetElement.closest('.item-card, .children-container, #drop-container');
            if (!dropTarget) return;

            let position, targetItemId;

            if (dropTarget.classList.contains('children-container')) {
                // Präzises Ziel + Position aus Kindern ableiten (above/below/into)
                const r = this.resolveDropOnChildrenContainer(e, dropTarget);
                position = r.position;
                targetItemId = r.targetItemId; // kann Headline (into) oder konkrete .item-card sein
            } else if (dropTarget.id === 'drop-container') {
                position = 'into';
                targetItemId = null;
            } else {
                const rect = dropTarget.getBoundingClientRect();
                const relY = e.clientY - rect.top;
                targetItemId = dropTarget.dataset.itemId;
                    if (relY < rect.height * 0.25) {
                        position = 'above';
                    } else if (relY > rect.height * 0.75) {
                        position = 'below';
                    } else {
                        position = 'into';
                    }
            }

            // Selbst-Ziel-Schutz (optional, verhindert No-Op oder inkonsistente Moves)
            if (targetItemId === itemId && position !== 'into') return;
            if (!ItemManager.canDropItem(itemId, targetItemId, position)) {
                UIManager.showToast('Diese Aktion ist nicht erlaubt', 'error');
                return;
            }

            ItemManager.moveItem(itemId, targetItemId, position);
        });

        container.addEventListener('dragleave', (e) => {
            // Indikator nur entfernen, wenn Cursor den Container wirklich verlässt
            if (!e.currentTarget.contains(e.relatedTarget)) {
            document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
            }
        });
    },

	    /**
     * Fügt ein Item mit Kind-Items in die UI ein.
     * @param {Object} item - Das Item
     * @param {number} [indentLevel=0] - Einrückungsebene
     */
    addItemToUI(item, indentLevel = 0){
		
        const container = document.getElementById('items-container');
		
		// Doppelte DOM-Einträge verhindern
		document.querySelector(`.item-card[data-item-id="${item.id}"]`)?.remove();
		
        const itemEl = this.createItemElement(item, indentLevel);
        container.appendChild(itemEl);
		
		// Kind-Elemente rekrusiv hinzufügen
		if (item.children && item.children.length > 0) {
			item.children.forEach(child => this.addItemToUI(child, indentLevel + 1));
		}
		
    },
    
    /**
     * Entfernt ein einzelnes Item aus der UI.
     * @param {string} itemId - Die Item-ID
     */
    removeItemFromUI(itemId) {
        document.querySelector(`.item-card[data-item-id="${itemId}"]`)?.remove();
    },

	/**
     * Entfernt ein Item inkl. aller Kinder aus der UI.
     * @param {string} itemId - Die Item-ID
     */
	removeItemAndChildrenFromUI(itemId) {
		const list = StateManager.getCurrentList();
		const item = ItemManager.findItemById(list.items, itemId);
		if (!item) return;

		const removeRecursive = (itm) => {
			document.querySelector(`.item-card[data-item-id="${itm.id}"]`)?.remove();
			if (itm.children && itm.children.length > 0) {
				itm.children.forEach(child => removeRecursive(child));
			}
		};
		removeRecursive(item);
	},
	
    /**
     * Aktualisiert die Liste im UI.
     */
    refreshListContent() {
        const list = StateManager.getCurrentList();
        this.updateListContent(list);
    },
    
    /**
     * Deaktiviert alle UI-Elemente für die Bearbeitung.
     */
    disableEditing() {
        // Deaktiviere alle relevanten Buttons
        const buttonsToDisable = [
            '#add-h1', '#add-h2', '#add-h3', '#add-p',
            '#apply-template', '#take-snapshot', '.edit-item', '.delete-item', '.comment-item', '.editor-comment-add', '.showGantt'
        ];
        
        buttonsToDisable.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
                btn.disabled = true;
            });
        });

        // Deaktiviere Drag & Drop
        document.querySelectorAll('.item-card').forEach(item => {
            item.draggable = false;
        });
    },
	
    /**
     * Aktiviert alle UI-Elemente für die Bearbeitung.
     */
	enableEditing() {
		// Aktiviere Buttons
		const buttonsToEnable = [
			'#add-h1', '#add-h2', '#add-h3', '#add-p',
			'#apply-template', '#take-snapshot', '.edit-item', '.delete-item', '.comment-item', '.editor-comment-add', '.showGantt'
		];
		
		buttonsToEnable.forEach(selector => {
			document.querySelectorAll(selector).forEach(btn => {
				btn.disabled = false;
			});
		});

		// Aktiviere Drag & Drop
		document.querySelectorAll('.item-card').forEach(item => {
			item.draggable = true;
		});
	},

	/**
     * Gibt die CSS-Klasse für ein Status-Badge zurück.
     * @param {string} status - Status des Items
     * @returns {string} CSS-Klasse
     */
    getStatusBadgeClass(status) {
        const statusClasses = {
            'ausstehend': 'bg-light text-dark',
            'in Bearbeitung': 'bg-primary',
            'Erledigt': 'bg-success',
            'abgebrochen': 'bg-secondary',
            'verworfen': 'bg-danger',
            'Sonstiges': 'bg-warning text-dark'
        };
        return statusClasses[status] || 'bg-light text-dark';
    },
    
    /**
     * Öffnet den Editor für ein Item.
     * @param {Object} item - Das Item
     */
    async showItemEditor(item) {

        await SettingsManager.ensureUserName();
		// Prüfen, ob Item eine Headline ist
        const isHeadline = [ 'h1', 'h2', 'h3'].includes(item.type);
		
        function flattenItems(items) {
                let result = [];
                items.forEach(item => {
                    result.push(item);
                    if (item.children && item.children.length > 0) {
                    result = result.concat(flattenItems(item.children));
                    }
                });
                return result;
        }

        

        
            // 1. Alle p-Elemente der aktuellen Liste (ohne sich selbst)
            const list = StateManager.getCurrentList();
            const allItemsFlat = flattenItems(list.items); // wie oben beschrieben
            const CONFIG_dateOnly =  await SettingsManager.getSetting("itemEditor_deadline_DateOnly");

            const CONFIG_COMMIT_LENGTH_limit = await SettingsManager.getSetting("commentLimit") ?? 0;
            const ONFIG_COMMIT_categories = await SettingsManager.getSetting("commentCategories") ?? ["Allgemein"];

        this.showModal(`Eintrag bearbeiten: ${item.data.report_topic || ''}`, `

  <div class="row">
    <!-- Linke Spalte: Editor -->
    <div class="${isHeadline ? 'col-lg-12' : 'col-lg-8' }">
      <!-- Dein bisheriger Editor-Inhalt -->
            
            <div class="mb-3">
                <label class="form-label">ID</label>
                <input type="text" class="form-control" id="item-id" value="${item.data.report_id || ''}">
            </div>
			
			
			<div class="mb-3 ${isHeadline ? 'd-none' : '' } ">
                <label class="form-label">Datum</label>
					<div class="input-group" id="report-date-picker-group" data-td-target-input="nearest" data-td-target-toggle="nearest">
					  <input type="text" 
                                class="form-control${isHeadline ? ' disabledInput' : ''}" 
                                id="item-date" 
                                value="${item.data.report_date || ''}" 
                                data-td-target="#item-date" 
                                placeholder="z.B. Oktober 2025"
                                ${isHeadline ? 'disabled' : ''}>
					  <button class="btn btn-outline-secondary" type="button" data-td-toggle="datetimepicker" data-td-target="#item-date" ${isHeadline ? 'disabled' : ''}>
						<i class="bi bi-calendar"></i>
					  </button>
					</div>
            </div>
			
			
            <div class="mb-3">
                <label class="form-label">Thema <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="item-topic" value="${item.data.report_topic || ''}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Beschreibung</label>
                <textarea class="form-control" id="item-desc" rows="5">${item.data.report_desc || ''}</textarea>
                <small>Markdown für **Fett**, *Kursiv*, __Underline__, --Strike-- und * List möglich. <a href="https://www.markdownguide.org/basic-syntax/" target="_blank">Dokumentation</a></small>
                
            </div>

			
            <div class="row mb-3" >

                <div class="col-md-6 ${isHeadline ? 'd-none' : '' }">
                    <label class="form-label">Verantwortlich</label>
                    <input type="text" class="form-control" id="item-responsible" value="${item.data.report_responsible || ''}">
                </div>

                 <div class="col-md-6 ${isHeadline ? 'd-none' : '' }">
                    <label class="form-label">Frist</label>
					<div class="input-group" id="report-deadline-picker-group" data-td-target-input="nearest" data-td-target-toggle="nearest">
					  <input type="text" class="form-control" id="item-deadline" value="${item.data.report_deadline || ''}" data-td-target="#item-deadline" placeholder="z.B. Oktober 2025">
					  <button class="btn btn-outline-secondary" type="button" data-td-toggle="datetimepicker" data-td-target="#item-deadline">
						<i class="bi bi-calendar"></i>
					  </button>
					</div>
                    <small class="form-text text-muted" id="auto-deadline-hint" style="">
                        Frist = spätester Vorgänger + Offset + eigene Dauer
                    </small>
                    <div class="text-info mt-1" id="auto-deadline-preview"></div>
                </div> 

                

				<div class="col-md- ${isHeadline ? 'd-none' : '' }">
                    <label class="form-label">Aufgabentyp</label>
					<select class="form-select" id="item-typ">
						<option value="Aufgabe" ${item.data.report_typ === 'Aufgabe' ? 'selected' : ''}>Aufgabe</option>
						<option value="Entscheidung" ${item.data.report_typ === 'Entscheidung' ? 'selected' : ''}>Entscheidung</option>
						<option value="Information" ${item.data.report_typ === 'Information' ? 'selected' : ''}>Information</option>
						<option value="Sonstiges" ${item.data.report_typ === 'Sonstiges' ? 'selected' : ''}>Sonstiges</option>
					</select>
                </div>
            </div>
			 
			 
            <div class="mb-3 ${isHeadline ? 'd-none' : '' } " >
                <label class="form-label">Status</label>
                <select class="form-select" id="item-status">
                    <option value="ausstehend" ${item.data.report_status === 'ausstehend' ? 'selected' : ''}>aussetehend</option>
                    <option value="in Bearbeitung" ${item.data.report_status === 'in Bearbeitung' ? 'selected' : ''}>in Bearbeitung</option>
                    <option value="Erledigt" ${item.data.report_status === 'Erledigt' ? 'selected' : ''}>Erledigt</option>
                    <option value="abgebrochen" ${item.data.report_status === 'abgebrochen' ? 'selected' : ''}>abgebrochen</option>
                    <option value="verworfen" ${item.data.report_status === 'verworfen' ? 'selected' : ''}>verworfen</option>
                    <option value="Sonstiges" ${item.data.report_status === 'Sonstiges' ? 'selected' : ''}>Sonstiges</option>
                </select>
            </div>


            
                <hr class=" ${isHeadline ? 'd-none' : '' } ">
                <div class="mb-3 ${isHeadline ? 'd-none' : '' } ">
                    <label class="form-label">Geschätzte Dauer des Vorgangs</label>
                    <div class="input-group" style="max-width:220px">
                    <input type="number" class="form-control" id="item-duration-value" min="0" value="${item.data.estimated_duration?.value || ''}">
                    <select class="form-select" id="item-duration-unit">
                        <option value="d" ${item.data.estimated_duration?.unit === 'd' ? 'selected' : ''}>Tage</option>
                        <option value="w" ${item.data.estimated_duration?.unit === 'w' ? 'selected' : ''}>Wochen</option>
                        <option value="m" ${item.data.estimated_duration?.unit === 'm' ? 'selected' : ''}>Monate</option>
                        <option value="y" ${item.data.estimated_duration?.unit === 'y' ? 'selected' : ''}>Jahre</option>
                    </select>
                    </div>
                </div>

                <!-- Abhängigkeiten/Vorgänger-Bereich -->
                <div class="mb-3 ${isHeadline ? 'd-none' : '' } ">
                    <label class="form-label">Abhängigkeiten / Vorgänger-Aufgaben</label>
                    <div id="dependencies-container"></div>
                    <button class="btn btn-sm btn-outline-secondary mt-2" id="add-dependency-btn">
                    <i class="bi bi-link-45deg"></i> Abhängigkeit hinzufügen
                    </button>
                </div>
                
                <!-- Nachfolger-Anzeige -->
                <div class="mb-3 ${isHeadline ? 'd-none' : '' }">
                    <label class="form-label">Nachfolger (automatisch)</label>
                    <div id="successors-container" class="small"></div>
                </div>
                  </div>

        <div class="col-lg-4 border-start ${isHeadline ? 'd-none' : '' }">
      <h6>Kommentare</h6>
      <div id="editor-comments-list" style="max-height:300px; overflow-y:auto">
        ${(item.comments || [])
          .map(c => `
            <div class="border rounded p-2 mb-2 small">
              <div><strong>${c.author}</strong> (${c.category})</div>
              <div class="text-muted">${new Date(c.date).toLocaleString()}</div>
              <div>${c.text}</div>
            </div>
          `).join('') || "<p class='text-muted'>Keine Kommentare</p>" }
      </div>
      <hr>
      <div class="mb-2">
        <label class="form-label">Neuer Kommentar</label>
        <textarea id="editor-comment-text" class="form-control" rows="2"
          ${CONFIG_COMMIT_LENGTH_limit > 0 ? `maxlength="${CONFIG_COMMIT_LENGTH_limit}"` : ""}></textarea>
        ${CONFIG_COMMIT_LENGTH_limit > 0 ? `<small id="editor-comment-counter" class="text-muted">Noch ${CONFIG_COMMIT_LENGTH_limit} Zeichen</small>` : ""}
      </div>
      <div class="mb-2">
        <label class="form-label">Kategorie</label>
        <select id="editor-comment-category" class="form-select form-select-sm">
          ${ONFIG_COMMIT_categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <button type="button" class="btn btn-sm btn-outline-primary w-100" id="editor-comment-add">
        <i class="bi bi-chat-dots"></i> Kommentar hinzufügen
      </button>
    </div>
  </div>
        `,() => {

            // Überschrift holen
            const topic = document.getElementById('item-topic').value;
            
            if (!topic.trim()) {
                const topicInput = document.getElementById('item-topic');
                topicInput.classList.add('is-invalid');

                // Fehlermeldung einmalig anhängen
                if (!topicInput.parentNode.querySelector('.invalid-feedback')) {
                    const errorEl = document.createElement('div');
                    errorEl.className = 'invalid-feedback';
                    errorEl.textContent = 'Bitte ein Thema eingeben';
                    topicInput.parentNode.appendChild(errorEl);
                }
                return false; // <<< Modal offen lassen!
            }
            
            //Validierung
             // Deadline-Validierung
            const deadlineInput = document.getElementById('item-deadline');
            const deadlineRaw = deadlineInput.value.trim();
            
            console.log('Editor DateMode:', CONFIG_dateOnly)

             if (CONFIG_dateOnly === "true") {
            const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
            if (deadlineRaw && !dateRegex.test(deadlineRaw)) {
                deadlineInput.classList.add('is-invalid');

                if (!deadlineInput.parentNode.querySelector('.invalid-feedback')) {
                    const errorEl = document.createElement('div');
                    errorEl.className = 'invalid-feedback';
                    errorEl.textContent = 'Bitte Datum im Format TT.MM.JJJJ eingeben';
                    deadlineInput.parentNode.appendChild(errorEl);
                }

                return false; // <<< Modal bleibt offen
            } else {
                deadlineInput.classList.remove('is-invalid');
                const err = deadlineInput.parentNode.querySelector('.invalid-feedback');
                if (err) err.remove();
            }
        }






            // Dauer
           	const durValue = parseInt(document.getElementById('item-duration-value').value, 10);
            const durUnit = document.getElementById('item-duration-unit').value;
            const autoDeadline = document.getElementById('auto-deadline')?.checked || false;

            let deadlineVal = document.getElementById('item-deadline').value || '';
            if (autoDeadline) {
                deadlineVal = calcAutoDeadline(item, allItemsFlat);
            }

            // Abhängigkeiten auslesen
                const deps = [];
                document.querySelectorAll('.dependency-entry').forEach(entry => {
                const kind = entry.querySelector('.dep-kind')?.value || "predecessor";
                const id = entry.querySelector('.dep-select')?.value;
                    if (!id) return; // Keine Auswahl → überspringen
                    const lagVal = parseInt(entry.querySelector('.dep-lag').value, 10) || 0;
                    const lagUnit = entry.querySelector('.dep-lag-unit').value;
                        deps.push({
                            id,
                            kind,
                            lag: { value: lagVal, unit: lagUnit }
                        });
                    });
                    

				const newData = {
					report_id: document.getElementById('item-id')?.value || '',
					report_date: document.getElementById('item-date').value || '',
					report_topic: topic,
					report_desc: document.getElementById('item-desc')?.value || '',
					report_responsible: document.getElementById('item-responsible')?.value || '',
					report_deadline: document.getElementById('item-deadline')?.value || '',
					report_typ: document.getElementById('item-typ')?.value || '',
					report_status: document.getElementById('item-status')?.value || '',
                    
                    // Abhängigeiten und Dauer des Vorgangs
                    dependencies: deps,
                    estimated_duration: (durValue ? { value: durValue, unit: durUnit } : null),
                    report_deadline: deadlineVal,
                    auto_deadline: autoDeadline,
				};

            /* --- Neu: Änderung der Frist oder Dauer führen zur Eingabeaufforderung des Änderungsgrundes -- 
                Dabei wird jedoch erst die Abfrage gestartet, wenn erstmalig eine Dauer oder Frist gesetzt wurden */

            // Vorherige Deadline und Dauer
            const oldDeadline = item.data.report_deadline || '';
            const oldDuration = item.data.estimated_duration || null;
      
           // neue Werte aus dem Formular
            const newDeadline = newData.report_deadline;
            const newDuration = newData.estimated_duration;
            // Bedingungen für Abfrage
            const deadlineChanged = !!oldDeadline && oldDeadline !== newDeadline;
            const durationChanged = !!oldDuration && JSON.stringify(oldDuration) !== JSON.stringify(newDuration);


                if (deadlineChanged || durationChanged) {
                    // Zweites Modal für Grund anzeigen
                    UIManager.showModal('Grund für Änderung der Frist oder Dauer', `
                        <div class="alert alert-warning" role="alert">
                            Damit auch alles für dich nachvollziehbar bleibt, ist eine Begründung für die Änderung sinnvoll.<br>
                            Eine Begründung wird immer dann abgefragt, wenn die Felder "Frist" oder "Dauer" geändert werden.<br>
                            Die Dokumentaion erfolgt nur innerhalb von Listify und wird nicht weitergegeben.
                            <br><br>
                            <strong>Abbrechen</strong> führt zum verwerfen der Änderung.
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Bitte Grund für die Änderung eingeben</label>
                            <textarea class="form-control" id="change-reason" rows="3" required></textarea>
                        </div>
                    `, () => {
                        const reason = document.getElementById('change-reason').value.trim();
                        if (!reason) {
                            UIManager.showToast('Grund ist erforderlich', 'error');
                            return false; // Modal offen lassen
                        }

                        // Item updaten
                        ItemManager.updateItem(item.id, newData, reason);

                        // Kommentar erfassen
                        CommentManager.addComment(item.id, {
                            author: SettingsManager.getCurrentUser(),
                            category: 'Änderung Frist/Dauer',
                            text: reason
                        });

                      

                        UIManager.refreshListContent();
                    });
                       return false; // verhindert, dass Hauptmodal schon speichert
                } else {

                

                            
                            ItemManager.updateItem(item.id, newData);
                            this.refreshListContent();
                            }
        },'xl'
    );

        // Längenbegrenzung für Kommentare
        if (CONFIG_COMMIT_LENGTH_limit > 0) {
        const textarea = document.getElementById("editor-comment-text");
        const counter = document.getElementById("editor-comment-counter");
            if (textarea && counter) {
                textarea.addEventListener("input", () => {
                const remaining = CONFIG_COMMIT_LENGTH_limit - textarea.value.length;
                counter.textContent = `Noch ${remaining} Zeichen`;
                });
            }
        }


	const addBtn = document.getElementById("editor-comment-add");
        if (addBtn) {
            addBtn.addEventListener("click", () => {
                const text = document.getElementById("editor-comment-text").value.trim();
                if (!text) {
                    UIManager.showToast("Kommentar darf nicht leer sein", "error");
                    return;
                }
                const category = document.getElementById("editor-comment-category").value;
                const author = SettingsManager.getCurrentUser();

                //Sicherung des Modals
                const state = backupModalFormState();

                    // 🟢 Werte sofort ins Item zurückschreiben
                    const durVal = parseInt(state.duration_value, 10);
                    item.data.estimated_duration = durVal ? { value: durVal, unit: state.duration_unit } : null;


                    item.data.report_id = state.report_id;
                    item.data.report_topic = state.report_topic;
                    item.data.report_desc = state.report_desc;
                    item.data.report_responsible = state.report_responsible;
                    item.data.report_deadline = state.report_deadline;
                    item.data.report_typ = state.report_typ;
                    item.data.report_status = state.report_status;
                    item.data.report_date = state.report_date;

                    

                CommentManager.addComment(item.id, { author, category, text });

                // Editor neu laden, damit Kommentar sofort sichtbar ist
                this.showItemEditor(item);
                restoreModalFormState(state, item);
            });
        }
		
		const datePickerGroup = document.getElementById('report-date-picker-group');
		if (datePickerGroup) {
			new tempusDominus.TempusDominus(datePickerGroup, {
				display: {
					components: {
						decades: true,
						year: true,
						month: true,
						date: true,
						hours: false,
						minutes: false,
						seconds: false
					},
					buttons: {
						today: true,
						clear: true,
						close: true
					}
				},
				localization: {
					locale: 'de',
					format: 'dd.MM.yyyy'
				}
			});
		}

		const deadlinePickerGroup = document.getElementById('report-deadline-picker-group');
		if (deadlinePickerGroup) {
			new tempusDominus.TempusDominus(deadlinePickerGroup, {
				display: {
					components: {
						decades: true,
						year: true,
						month: true,
						date: true,
						hours: false,
						minutes: false,
						seconds: false
					},
					buttons: {
						today: true,
						clear: true,
						close: true
					}
				},
				localization: {
					locale: 'de',
					format: 'dd.MM.yyyy'
				}
			});
		}

        // Nur wenn Item keine Headline ist
        if (!isHeadline) {
            const allP = allItemsFlat.filter(it => it.type === 'p' && it.id !== item.id && !it.isDeleted);
            
            // 
            // Event: Checkbox Umschalten
            //const autoDeadlineChk = document.getElementById('auto-deadline');
       

          

            function renderAutoDeadlinePreview() {
                // 1. Auslesen der aktuellen Werte aus allen Inputs im Modal
                const tempItem = JSON.parse(JSON.stringify(item)); // Deep Clone!
                // Dauer
                const durValue = parseInt(document.getElementById('item-duration-value').value, 10) || 0;
                const durUnit = document.getElementById('item-duration-unit').value;
                tempItem.data.estimated_duration = durValue ? { value: durValue, unit: durUnit } : null;

                // Dependencies
                const deps = [];
                document.querySelectorAll('.dependency-entry').forEach(entry => {
                    const kind = entry.querySelector('.dep-kind')?.value || "predecessor";
                    const id = entry.querySelector('.dep-select')?.value;
                    if (!id) return;
                    const lagVal = parseInt(entry.querySelector('.dep-lag').value, 10) || 0;
                    const lagUnit = entry.querySelector('.dep-lag-unit').value;
                    deps.push({ id, kind, lag: { value: lagVal, unit: lagUnit } });
                });
                tempItem.data.dependencies = deps;

                // 2. Jetzt NEU berechnen!
                const val = calcAutoDeadline(tempItem, allItemsFlat);

                const previewEl = document.getElementById('auto-deadline-preview');
                if (val) {
                    previewEl.textContent = `Empfohlene Frist (aus Abhängigkeiten): ${val}`;
                } else {
                    previewEl.innerHTML = '<span class="text-muted">Keine automatisch berechenbare Frist vorhanden</span>';
                }
            }


            function bindAutoDeadlineEvents() {
                document.getElementById('item-deadline')?.addEventListener('input', renderAutoDeadlinePreview);
                document.getElementById('item-duration-value')?.addEventListener('input', renderAutoDeadlinePreview);
                document.getElementById('item-duration-unit')?.addEventListener('change', renderAutoDeadlinePreview);

                document.querySelectorAll('.dependency-entry input, .dependency-entry select').forEach(el => {
                    el.addEventListener('input', renderAutoDeadlinePreview);
                    el.addEventListener('change', renderAutoDeadlinePreview);
                });
            }

        // Initial anzeigen
        //renderAutoDeadlinePreview();

    // --- EVENTS ---
    // Deadline
    document.getElementById('item-deadline')?.addEventListener('input', renderAutoDeadlinePreview);
    // Dauer
    document.getElementById('item-duration-value')?.addEventListener('input', renderAutoDeadlinePreview);
    document.getElementById('item-duration-unit')?.addEventListener('change', renderAutoDeadlinePreview);
    





            // 2. Container für Abhängigkeiten
            const depContainer = document.getElementById('dependencies-container');
            depContainer.innerHTML = '';

            // 3. Für jede existierende Abhängigkeit (item.dependencies = Array)
            (item.data.dependencies || []).forEach((dep, idx) => {
                // Finde Vorgänger-Element
                const pred = allP.find(p => p.id === dep.id);
                depContainer.innerHTML += `
                <div class="dependency-entry mb-1 d-flex align-items-center" data-index="${idx}">
                    <select class="form-select form-select-sm me-1 dep-kind" style="max-width:110px;">
                    <option value="predecessor" ${dep.kind === "predecessor" ? 'selected' : ''}>Vorgänger</option>
                   <!-- <option value="successor" ${dep.kind === "successor" ? 'selected' : ''}>Nachfolger</option> -->
                    </select>
                    <select class="form-select form-select-sm me-1 dep-select" style="max-width:360px;">
                        <option value="">[Wähle Vorgang]</option>

                        ${allP
                            .filter(p => !p.isDeleted)  
                            .map(p => {
                            console.log('Item:', p);
                            const parents = resolveParentHeadlines(p, allItemsFlat);
  
                            //const parentPath = parents.map(par => `${par.type.toUpperCase()}: ${par.data.report_topic || ''}`).join(' > ');
                            const parentPath = parents.map(par => `${par.type.toUpperCase()}: ${par.data.report_topic || ''}`).join(' > ');
                            
                            return `
                                <option value="${p.id}" ${p.id === dep.id ? 'selected' : ''}>
                                    ${parentPath ? parentPath + ' > ' : ''}[${p.data.report_id || ''}] ${p.data.report_topic || ''}
                                </option>
                            `;
                        }).join('')}
                    </select>
                    <span class="badge bg-light text-dark me-2">
                    Status: <strong>${pred?.data?.report_status || '-'}</strong>
                    </span>
                    <span class="badge bg-light text-dark me-2">
                    Deadline: <strong>${pred?.data?.report_deadline || '-'}</strong>
                    </span>
                    <input type="number" class="form-control form-control-sm me-1 dep-lag" value="${dep.lag?.value ?? 0}" style="max-width:60px;">
                    <select class="form-select form-select-sm me-1 dep-lag-unit" style="max-width:80px;">
                    <option value="d" ${dep.lag?.unit === 'd' ? 'selected' : ''}>Tage</option>
                    <option value="w" ${dep.lag?.unit === 'w' ? 'selected' : ''}>Wochen</option>
                    <option value="m" ${dep.lag?.unit === 'm' ? 'selected' : ''}>Monate</option>
                    <option value="y" ${dep.lag?.unit === 'y' ? 'selected' : ''}>Jahre</option>
                    </select>
                    <button class="btn btn-sm btn-outline-danger dep-remove" title="Entfernen"><i class="bi bi-x"></i></button>
                </div>
                `;
            });

            // Button zum Hinzufügen einer neuen Abhängigkeit
            // + Ergänzung einer temporären Sicherung der bisherigen Werte
            document.getElementById('add-dependency-btn').addEventListener('click', () => {
                const state = backupModalFormState(); // Hier werden die aktuellen Einträge gesichert
                //(item.data.dependencies ||= []).push({ id: '', lag: { value: 0, unit: 'd' } });
                 // 🟢 Dauer & andere Felder direkt ins Item zurückschreiben
                const durVal = parseInt(state.duration_value, 10);
                item.data.estimated_duration = durVal ? { value: durVal, unit: state.duration_unit } : null;

                item.data.report_id = state.report_id;
                item.data.report_topic = state.report_topic;
                item.data.report_desc = state.report_desc;
                item.data.report_responsible = state.report_responsible;
                item.data.report_deadline = state.report_deadline;
                item.data.report_typ = state.report_typ;
                item.data.report_status = state.report_status;
                item.data.report_date = state.report_date;

                (item.data.dependencies ||= []).push({ id: '', lag: { value: 0, unit: 'd' } });

                this.showItemEditor(item); // Modal neu rendern!
                restoreModalFormState(state, item); // Hier werden die bisherigen Einträge zurück ins Modal geschrieben
                
                bindAutoDeadlineEvents(); // <<< NEU
            });
            
       

            // Entfernen-Buttons
            depContainer.querySelectorAll('.dep-remove').forEach((btn, i) => {
                btn.addEventListener('click', () => {
                    btn.stopPropagation;
                    if(confirm(`Vorgang löschen`))  {
                        const fromState = backupModalFormState(); // Hier werden die aktuellen Einträge gesichert
                        item.data.dependencies.splice(i, 1);
                        this.showItemEditor(item); // Modal neu rendern!
                        restoreModalFormState(fromState, item); // Hier werden die bisherigen Einträge zurück ins Modal geschrieben
                        bindAutoDeadlineEvents(); // <<< NEU
                    }
                });
            });

            // Nachfolger ermitteln (siehe oben Hilfsfunktion)

            const successors = findSuccessors(allItemsFlat, item.id); // NICHT item.data.id!
            const succContainer = document.getElementById('successors-container');
            succContainer.innerHTML = successors.length
                ? `<ul class="list-unstyled mb-0">
                    ${successors.map(s => {
                        // Das Dependency-Objekt, das auf dieses Item zeigt
                        const depObj = (s.data.dependencies || []).find(dep => dep.id === item.id);
                        let lagText = '';
                        if (depObj && depObj.lag) {
                            const val = depObj.lag.value || 0;
                            const unitMap = { d: 'Tage', w: 'Wochen', m: 'Monate', y: 'Jahre' };
                            const unitLabel = unitMap[depObj.lag.unit] || depObj.lag.unit || '';
                            lagText = `, Offset: ${val > 0 ? '+' : ''}${val} ${unitLabel}`;
                        }
                        return `
                            <li>
                                <strong>${s.data.report_id}</strong>: ${s.data.report_topic}
                                <small class="text-muted ms-2">[Status: ${s.data.report_status || '-'}${lagText}]</small>
                            </li>
                        `;
                    }).join('')}
                </ul>`
                : '<span class="text-muted">Keine Nachfolger</span>';

                    // Alle Abhängigkeits-Offsets und -Einheiten und Dropdowns
                    document.querySelectorAll('.dependency-entry input, .dependency-entry select').forEach(el => {
                        el.addEventListener('input', renderAutoDeadlinePreview);
                        el.addEventListener('change', renderAutoDeadlinePreview);
                        
                    });

                renderAutoDeadlinePreview();
                bindAutoDeadlineEvents(); // <<< NEU
            }
    },
    

    /**
     * Fügt einen Snapshot zur UI hinzu.
     * @param {Object} snapshot - Der Snapshot
     */

    addSnapshotToUI(snapshot) {
		const container = document.getElementById('snapshots-container');
		const snapshotEl = document.createElement('div');
		snapshotEl.className = 'snapshot-card card';
		snapshotEl.dataset.snapshotId = snapshot.id;
		snapshotEl.innerHTML = `
			<div class="card-body">
				<h6 class="card-title">${snapshot.name}</h6>
				<small>${formatDate(snapshot.date)}</small>
				<div class="mt-2 d-flex justify-content-end">
					<button class="btn btn-sm btn-outline-primary compare-snapshot me-1" title="Vergleichen" style="display:none;">
						<i class="bi bi-compare"></i>
					</button>
					<button class="btn btn-sm btn-outline-danger delete-snapshot" title="Löschen">
						<i class="bi bi-trash"></i>
					</button>
				</div>
			</div>
		`;

		// Klick auf Snapshot-Karte = Snapshot laden
		snapshotEl.addEventListener('click', (e) => {
			if (
				e.target.closest('.delete-snapshot') ||
				e.target.closest('.compare-snapshot')
			) return;

			const listId = StateManager.getCurrentList()?.meta?.id;
			const allSnapshots = StateManager.getCurrentProject()?.snapshots?.[listId] || [];
			const snapshotData = allSnapshots.find(s => s.id === snapshot.id);
			if (!snapshotData) return;

			SnapshotManager2.loadSnapshot(snapshotData);
		});
		// Löschen
		snapshotEl.querySelector('.delete-snapshot').addEventListener('click', (e) => {
			e.stopPropagation();
			const listId = StateManager.getCurrentList()?.meta?.id;
			if (listId) {
				SnapshotManager2.deleteSnapshot(listId, snapshot.id);
			}
		});

		container.appendChild(snapshotEl);
	},
		    /**
     * Entfernt einen Snapshot aus der UI.
     * @param {string} snapshotId - Die Snapshot-ID
     */
    removeSnapshotFromUI(snapshotId) {
			document.querySelector(`.snapshot-card[data-snapshot-id="${snapshotId}"]`)?.remove();
		},
		    /**
     * Aktualisiert die Snapshot-Ansicht für eine Liste.
     * @param {string} listId - Die Listen-ID
     */
		updateSnapshotsForList(listId) {
		const container = document.getElementById('snapshots-container');
		container.innerHTML = '';

		const project = StateManager.getCurrentProject();
		const snapshots = project?.snapshots?.[listId] || [];

		snapshots.forEach(snapshot => {
			UIManager.addSnapshotToUI(snapshot);
		});
	},
	
	
	
	    /**
     * Zeigt eine Toast-Nachricht an.
     * @param {string} message - Die Nachricht
     * @param {string} [type='success'] - Typ ('success' oder 'error')
     */
    showToast(message, type = 'success') {
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');
        
        toastTitle.className = 'me-auto';
        if (type === 'error') {
            toastTitle.classList.add('text-danger');
        } else if (type === 'success') {
            toastTitle.classList.add('text-success');
        }
        
        toastTitle.textContent = type === 'error' ? 'Fehler' : 'Erfolg';
        toastMessage.textContent = message;
        
        this.toast.show();
    },
    
	    /**
     * Zeigt ein Modal-Fenster mit individuellem Inhalt und Callback.
     * @param {string} title - Titel des Modals
     * @param {string} body - HTML-Inhalt
     * @param {Function} [onConfirm] - Callback bei Bestätigung
     * @param {string} [size='lg'] - Größe des Modals ('sm', 'lg', 'xl')
     * @param {Function} [onShown] - Callback nach Anzeigen
     */
    showModal(title, body, onConfirm, size = 'lg', onShown = null) {
        const modal = document.getElementById('mainModal');
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        const modalFooter = modal.querySelector('.modal-footer');

        // Bereinigung alter Event-Listener
        modalFooter.querySelector('#modal-confirm')?.removeEventListener('click', this._currentModalHandler);
        
        // Modal-Inhalt aktualisieren
        modalTitle.textContent = title;
        modalBody.innerHTML = body;
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
            <button type="button" class="btn btn-primary" id="modal-confirm">Bestätigen</button>
        `;

        // Formular-Submit-Handler
        const form = modalBody.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (onConfirm) {
                    const result = onConfirm(e);
                    if (result !== false) {
                        bootstrap.Modal.getInstance(modal).hide();
                    }
                }
            });
        }

        // Bestätigungs-Button-Handler
        const confirmBtn = modalFooter.querySelector('#modal-confirm');
        this._currentModalHandler = () => {
            if (onConfirm) {
                const result = onConfirm();
                if (result !== false) {
                    bootstrap.Modal.getInstance(modal).hide();
                }
            } else {
                bootstrap.Modal.getInstance(modal).hide();
            }
        };
        confirmBtn.addEventListener('click', this._currentModalHandler);

        // Modal anzeigen
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modal);
        if (size) {
            modal.querySelector('.modal-dialog').classList.add(`modal-${size}`);
        }

        // Event-Callback registrieren
        if (typeof onShown === 'function') {
            const handler = () => {
                modal.removeEventListener('shown.bs.modal', handler); // einmalig
                onShown();
            };
            modal.addEventListener('shown.bs.modal', handler);
        }

        modalInstance.show();


    },
  /**
     * Schließt das aktuell offene Modal-Fenster.
     */
closeModal() {
    const modal = document.getElementById('mainModal');
    const instance = bootstrap.Modal.getInstance(modal);
    if (instance) {
        instance.hide();
    }
},
    
    /**
     * Zeigt einen Vergleich von zwei Snapshots im Modal.
     * @param {Object} comparisonData - Vergleichsdaten
     */
    showSnapshotComparison(comparisonData) {
        const { snapshot1, snapshot2, comparison } = comparisonData;
        
        const modalContent = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5>${snapshot1.description}</h5>
                    <small>${formatDate(snapshot1.date)}</small>
                </div>
                <div class="col-md-6">
                    <h5>${snapshot2.description}</h5>
                    <small>${formatDate(snapshot2.date)}</small>
                </div>
            </div>
            
            <div class="mb-4">
                <h5>Zusammenfassung</h5>
                <div class="d-flex flex-wrap gap-2">
                    <span class="badge bg-success">Hinzugefügt: ${comparison.added.length}</span>
                    <span class="badge bg-danger">Entfernt: ${comparison.removed.length}</span>
                    <span class="badge bg-primary">Geändert: ${comparison.changed.length}</span>
                    <span class="badge bg-secondary">Unverändert: ${comparison.unchanged.length}</span>
                </div>
            </div>
            
            <div class="comparison-section added">
                <h5>Hinzugefügte Elemente</h5>
                ${comparison.added.length > 0 ? 
                    comparison.added.map(item => `
                        <div class="card mb-2">
                            <div class="card-body">
                                <strong>${item.data.report_id}:</strong> ${item.data.report_topic}
                            </div>
                        </div>
                    `).join('') : 
                    '<p class="text-muted">Keine neuen Elemente</p>'
                }
            </div>
            
            <div class="comparison-section removed mt-4">
                <h5>Entfernte Elemente</h5>
                ${comparison.removed.length > 0 ? 
                    comparison.removed.map(item => `
                        <div class="card mb-2">
                            <div class="card-body">
                                <strong>${item.data.report_id}:</strong> ${item.data.report_topic}
                            </div>
                        </div>
                    `).join('') : 
                    '<p class="text-muted">Keine entfernten Elemente</p>'
                }
            </div>
            
            <div class="comparison-section changed mt-4">
                <h5>Geänderte Elemente</h5>
                ${comparison.changed.length > 0 ? 
                    comparison.changed.map(change => `
                        <div class="card mb-3">
                            <div class="card-header">
                                <strong>${change.item.data.report_id}:</strong> ${change.item.data.report_topic}
                            </div>
                            <div class="card-body">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Feld</th>
                                            <th>Vorher</th>
                                            <th>Nachher</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${Object.entries(change.changes).map(([field, values]) => `
                                            <tr>
                                                <td>${field}</td>
                                                <td class="text-danger">${values.old}</td>
                                                <td class="text-success">${values.new}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `).join('') : 
                    '<p class="text-muted">Keine geänderten Elemente</p>'
                }
            </div>
        `;
        
        this.showModal('Snapshot Vergleich', modalContent, null, 'xl');
    },
	    /**
     * Setzt die UI in den Readonly-Modus (z.B. bei Snapshot-Ansicht).
     * @param {boolean} enabled - Readonly-Modus aktivieren/deaktivieren
     * @param {string} [snapshotName=''] - Name des Snapshots
     */
setReadOnlyMode(enabled, snapshotName = '') {
	const noticeArea = document.getElementById('readonly-notice');

	// Elemente deaktivieren oder aktivieren
	document.querySelectorAll('[data-editable="true"]').forEach(el => {
		if (enabled) {
			el.setAttribute('disabled', 'true');
		} else {
			el.removeAttribute('disabled');
		}
	});

	// Hinweis anzeigen oder entfernen
	if (enabled && noticeArea) {
		noticeArea.innerHTML = `
			<div class="alert alert-warning d-flex justify-content-between align-items-center mb-3" role="alert">
				<span>Snapshot-Ansicht: <strong>${snapshotName}</strong> Bearbeitung gesperrt</span>
				<button id="exit-snapshot" class="btn btn-sm btn-outline-secondary">
					<i class="bi bi-x-lg"></i> Zurück zur aktuellen Liste
				</button>
			</div>
		`;
		UIManager.disableEditing(); 

		// Event-Listener erneut anhängen (verhindert Duplikate durch .innerHTML = …)
		setTimeout(() => {
			const btn = document.getElementById('exit-snapshot');
			if (btn) {
				btn.addEventListener('click', () => {
					UIManager.setReadOnlyMode(false);

					const currentSnapshotListId = StateManager.getCurrentList()?.meta?.id;
					const original = StateManager.getListById(currentSnapshotListId);
					if (original) {
						StateManager.setCurrentList(original);
						UIManager.showToast('Zurück zur aktuellen Liste', 'info');
					} else {
						UIManager.showToast('Fehler beim Laden der Original-Liste', 'error');
					}
				});
			}
		}, 0); // sichert, dass DOM vorhanden ist
	} else if (!enabled && noticeArea) {
		noticeArea.innerHTML = '';
		UIManager.enableEditing();
	}
}


};
