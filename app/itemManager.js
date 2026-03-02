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

import { StateManager } from './stateManager.js';

import { generateUUID, formatGermanDate , deepEqual} from './utils.js'
import { HistoryManager } from './historyManager.js';
import { UIManager } from './uiManager.js';
import { ListManager } from './listManager.js';
import { HelperManager } from './helperManager.js';

function dependenciesEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    // Sortieren nach id für Vergleich
    const sortFn = x => x.id + (x.kind || '') + ((x.lag?.value || 0) + (x.lag?.unit || ''));
    const arrA = [...a].sort((x, y) => sortFn(x).localeCompare(sortFn(y)));
    const arrB = [...b].sort((x, y) => sortFn(x).localeCompare(sortFn(y)));
    return arrA.every((item, i) =>
        item.id === arrB[i].id &&
        item.kind === arrB[i].kind &&
        (item.lag?.value ?? 0) === (arrB[i].lag?.value ?? 0) &&
        (item.lag?.unit ?? 'd') === (arrB[i].lag?.unit ?? 'd')
    );
}

export const ItemManager = {
    addItem(type, parentId = null, initialData = null) {

    HelperManager.showHelpTo('hilfe-item-add');
        const list = StateManager.getCurrentList();
        if (!list || ListManager.isListFinalized(list.meta.id)) return null;
        
        const newItem = {
            id: generateUUID(),
            type,
            sort: this.getNextSortIndex(list.items, parentId),
            parentId,
            data: {
                report_id: '',
				report_date: '',
                report_add_date: new Date().toISOString().split('T')[0],
                report_topic: '',
                report_desc: '',
                report_responsible: '',
                report_deadline: '',
				report_typ: '',
                report_status: 'in Bearbeitung',
				dependencies: [], // Array der Abhägigkeiten
				estimated_duration: null, // Dauer oder { value: 0, unit: "d" }
				auto_deadline: false,
                ...(initialData || {})
            },
            children: [],
            comments: [],
            isDeleted: false
        };
        
        StateManager.updateProject(project => {
            const list = project.lists[StateManager.getCurrentList().meta.id];
            
            if (parentId) {
                const parentItem = this.findItemById(list.items, parentId);
                if (parentItem) {
                    parentItem.children.push(newItem);
                    parentItem.children.sort((a, b) => a.sort - b.sort);
                }
            } else {
                list.items.push(newItem);
                list.items.sort((a, b) => a.sort - b.sort);
            }
            
            list.meta.lastModified = new Date().toISOString();
            return project;
        });
        


        
        HistoryManager.logChange(newItem.id, 'CREATE', { item: newItem });
        UIManager.addItemToUI(newItem);
        return newItem;
    },
    
    updateItem(itemId, newData, reason = null) {
        const list = StateManager.getCurrentList();
        if (!list || ListManager.isListFinalized(list.meta.id)) return;
        
        StateManager.updateProject(project => {
            const list = project.lists[StateManager.getCurrentList().meta.id];
            const item = this.findItemById(list.items, itemId);
            
            if (item) {
                const changes = {};
				// Feld dependencies

				Object.keys(newData).forEach(key => {
                    if (key === 'dependencies') {
                        if (!dependenciesEqual(item.data[key], newData[key])) {
                            changes[key] = [item.data[key], newData[key]];
                            item.data[key] = newData[key];
                        }
                    } else if (key === 'estimated_duration') {
                        if (!deepEqual(item.data[key], newData[key])) {
                            changes[key] = [item.data[key], newData[key]];
                            item.data[key] = newData[key];
                        }
                    } else {
                        if (item.data[key] !== newData[key]) {
                            changes[key] = [item.data[key], newData[key]];
                            item.data[key] = newData[key];
                        }
                    }
                });


               /**  Object.keys(newData).forEach(key => {
                    if (item.data[key] !== newData[key]) {
                        changes[key] = [item.data[key], newData[key]];
                        item.data[key] = newData[key];
                    }
                }); **/
               
                if (Object.keys(changes).length > 0) {
                    list.meta.lastModified = new Date().toISOString();
                    
                    HistoryManager.logChange(itemId, 'UPDATE', {
                        ...changes, 
                        ...(reason ? {reason} : {})
                    });
                }

    
            }
            return project;
        });
    },
    
    softDeleteItem(itemId) {
        StateManager.updateProject(project => {
            const list = project.lists[StateManager.getCurrentList().meta.id];
            const item = this.findItemById(list.items, itemId);
            
            if (item) {
                item.isDeleted = true;
                item.deletedAt = new Date().toISOString();
                list.meta.lastModified = new Date().toISOString();
                HistoryManager.logChange(itemId, 'DELETE', {});
            }
            return project;
        });
        
        UIManager.removeItemFromUI(itemId);
    },
    restoreItem(itemId) {
        StateManager.updateProject(project => {
            const list = project.lists[StateManager.getCurrentList().meta.id];
            const item = this.findItemById(list.items, itemId);

            if (item) {
                item.isDeleted = false;
                delete item.deletedAt;
                list.meta.lastModified = new Date().toISOString();
                HistoryManager.logChange(itemId, 'RESTORE', {});
            }
            return project;
        });
        UIManager.refreshListContent();
    },

    deleteItemPermanently(itemId) {
        StateManager.updateProject(project => {
            const list = project.lists[StateManager.getCurrentList().meta.id];
            const removeRec = (items) => {
                for (let i = items.length - 1; i >= 0; i--) {
                    const it = items[i];
                    if (it.id === itemId) {
                        items.splice(i, 1);
                        return true;
                    }
                    if (Array.isArray(it.children) && it.children.length > 0 && removeRec(it.children)) {
                        return true;
                    }
                }
                return false;
            };

            const removed = removeRec(list.items);
            if (removed) {
                const cleanupDependencies = (items) => {
                    items.forEach(it => {
                        if (Array.isArray(it.data?.dependencies)) {
                            it.data.dependencies = it.data.dependencies.filter(dep => dep.id !== itemId);
                        }
                        if (Array.isArray(it.children) && it.children.length > 0) {
                            cleanupDependencies(it.children);
                        }
                    });
                };
                cleanupDependencies(list.items);
                list.meta.lastModified = new Date().toISOString();
                HistoryManager.logChange(itemId, 'DELETE_PERMANENT', {});
            }
            return project;
        });
        UIManager.refreshListContent();
    },
    
    findItemById(items, itemId) {
        for (const item of items) {
            if (item.id === itemId) return item;
            if (item.children && item.children.length > 0) {
                const found = this.findItemById(item.children, itemId);
                if (found) return found;
            }
        }
        return null;
    },
 

    getNextSortIndex(items, parentId) {
        // Finde die maximale Sortierindex für die aktuelle Ebene
        let maxSort = -1;
        
        const findMaxSort = (itemsToCheck) => {
            itemsToCheck.forEach(item => {
                if (item.parentId === parentId && item.sort > maxSort) {
                    maxSort = item.sort;
                }
                
                if (item.children && item.children.length > 0) {
                    findMaxSort(item.children);
                }
            });
        };
        
        findMaxSort(items);
        return maxSort + 1;
    },

	// Verbindliche Signatur: Objekte rein, nicht IDs
	isValidDrop(sourceItem, targetItem, position) {
		const list = StateManager.getCurrentList();
		if (!list || !sourceItem) return false;

		// 1) Kein Drop in eigene Nachfahren
		if (targetItem && this.isChildOf(sourceItem, targetItem)) return false;

		// 2) Niemals "into" in ein p-Element
		if (position === 'into' && targetItem && targetItem.type === 'p') return false;

		// 3) Level-Regeln (anpassbar)
		const allowParent = {
			h1: [null],           // h1 nur als Root
			h2: ['h1'],           // h2 nur unter h1
			h3: ['h2'],           // h3 nur unter h2
			p:  ['h1','h2','h3'], // p unter jeder Headline
		};

		// Helper zum Ermitteln des Parent-Typs
		const getParentById = (pid) => pid ? this.findItemById(list.items, pid) : null;

		if (position === 'into') {
			// Parent ist das Ziel (oder Root bei null)
			const parentType = targetItem ? targetItem.type : null;
			const allowed = allowParent[sourceItem.type] || [];
			return allowed.includes(parentType);
		}

		// above/below: Parent wird der Parent des Ziel-Elements (oder Root)
		const newParent = targetItem?.parentId ? getParentById(targetItem.parentId) : null;
		const newParentType = newParent ? newParent.type : null;

		// Same-Parent-Shortcut: reines Re-Order innerhalb derselben Gruppe IMMER erlauben
		const currentParentId = sourceItem.parentId || null;
		const newParentId = newParent ? newParent.id : null;
		if (currentParentId === newParentId) return true;

		// Sonst Level-Regeln prüfen
		const allowed = allowParent[sourceItem.type] || [];
		if (!allowed.includes(newParentType)) return false;

		// Root-Geschwister: nur h1 darf auf Root-Ebene liegen
		if (newParentType === null && sourceItem.type !== 'h1') return false;

		return true;
	},


	createDropIndicator(target, position) {
		// Entferne bestehende Indikatoren
		document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
		
		const indicator = document.createElement('div');
		indicator.className = `drop-indicator drop-${position}`;
		
		const rect = target.getBoundingClientRect();
		const scrollY = window.scrollY || document.documentElement.scrollTop;
		
		switch (position) {
			case 'above':
				indicator.style.position = 'absolute';
				indicator.style.top = `${rect.top + scrollY - 2}px`;
				indicator.style.left = `${rect.left}px`;
				indicator.style.width = `${rect.width}px`;
				indicator.style.height = '10px';
				indicator.style.backgroundColor = '#0d6efd';
				indicator.style.pointerEvents = 'none';
				indicator.style.zIndex = '1000';
				break;
				
			case 'below':
				indicator.style.position = 'absolute';
				indicator.style.top = `${rect.bottom + scrollY - 2}px`;
				indicator.style.left = `${rect.left}px`;
				indicator.style.width = `${rect.width}px`;
				indicator.style.height = '10px';
				indicator.style.backgroundColor = '#0d6efd';
				indicator.style.pointerEvents = 'none';
				indicator.style.zIndex = '1000';
				break;
				
			case 'into':
				indicator.style.position = 'absolute';
				indicator.style.top = `${rect.top + scrollY}px`;
				indicator.style.left = `${rect.left}px`;
				indicator.style.width = `${rect.width}px`;
				indicator.style.height = `${rect.height}px`;
				indicator.style.border = '2px dashed #0d6efd';
				indicator.style.borderRadius = '0.25rem';
				indicator.style.pointerEvents = 'none';
				indicator.style.zIndex = '1000';
				indicator.style.backgroundColor = 'rgba(13, 110, 253, 0.1)';
				break;
		}
		
		document.body.appendChild(indicator);
		return indicator;
	},
	
	canDropItem(sourceItemId, targetItemId, position) {
		const list = StateManager.getCurrentList();
		if (!list) return false;

		const sourceItem = this.findItemById(list.items, sourceItemId);
		const targetItem = targetItemId ? this.findItemById(list.items, targetItemId) : null;

	    //console.log("canDropItem:", "sourceItem:", sourceItem , "targetItem:", targetItem, "position:", position);
		return this.isValidDrop(sourceItem, targetItem, position);
	},
 

    // NEUE METHODE: Überprüft, ob ein Element ein Kind eines anderen ist
    isChildOf(parentItem, childItem) {
        if (!parentItem.children || parentItem.children.length === 0) {
            return false;
        }
        
        if (parentItem.children.some(child => child.id === childItem.id)) {
            return true;
        }
        
        return parentItem.children.some(child => this.isChildOf(child, childItem));
    },

    // ÄNDERUNG: handleDrop - mit erweiterter Validierung
    handleDrop(e) {
        e.preventDefault();
        const dropContainer = document.getElementById('drop-container');
        dropContainer.classList.remove('active');
        
        // Entferne Drop-Indikatoren
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        
        const itemId = e.dataTransfer.getData('text/plain');
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        
        if (!itemId || !targetElement) return;
        
        const dropTarget = targetElement.closest('.item-card, #drop-container');
        if (!dropTarget) return;
        
        const rect = dropTarget.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const isContainer = dropTarget.id === 'drop-container';
        
        // Position bestimmen
        let position, targetItemId;
        if (isContainer) {
            position = 'into';
            targetItemId = null;
        } else {
            targetItemId = dropTarget.dataset.itemId;
            if (relY < rect.height * 0.25) {
                position = 'above';
            } else if (relY > rect.height * 0.75) {
                position = 'below';
            } else {
                position = 'into';
            }
        }
        
        // Überprüfe, ob die Operation erlaubt ist
        if (!this.canDropItem(itemId, targetItemId, position)) {
            UIManager.showToast('Diese Aktion ist nicht erlaubt', 'error');
            return;
        }
        
        // Bewegung durchführen
        this.moveItem(itemId, targetItemId, position);
    },

	moveItem(itemId, targetItemId, position) {
        const list = StateManager.getCurrentList();
        if (!list) return;

        // 1) komplettes Item (inkl. Teilbaum) aus dem alten Ort entnehmen
        const item = this.removeItemById(list.items, itemId);
        if (!item) return;

        // 2) Ziel bestimmen: Parent + Geschwisterliste
        const targetItem = targetItemId ? this.findItemById(list.items, targetItemId) : null;

        let newParent = null;
        let siblings = null;

        if (position === 'into') {
            newParent = targetItem || null;                       // null = Root
            siblings = newParent ? newParent.children : list.items;
        } else {
            // above/below: Geschwister des Ziel-Parents
            newParent = targetItem?.parentId
            ? this.findItemById(list.items, targetItem.parentId)
            : null;
            siblings = newParent ? newParent.children : list.items;
        }
        if (!siblings) return;

        // 3) Einfüge-Index bestimmen
        let insertIndex;
        if (position === 'above') {
            insertIndex = siblings.findIndex(i => i.id === targetItemId);
        } else if (position === 'below') {
            insertIndex = siblings.findIndex(i => i.id === targetItemId) + 1;
        } else {
            insertIndex = siblings.length; // "into" -> ans Ende
        }

        // 4) Item einfügen (Teilbaum kommt mit)
        siblings.splice(insertIndex, 0, item);

        // 5) Parent-Referenz des verschobenen Items setzen
        item.parentId = (position === 'into')
            ? (targetItemId || null)      // into -> Ziel als Parent (oder Root)
            : (newParent ? newParent.id : null); // above/below -> Parent des Ziels

        // 6) Sort-Indices unter neuen Geschwistern neu durchzählen
        siblings.forEach((el, idx) => { el.sort = idx; });

        // 7) Projekt-Metadaten + UI
        list.meta.lastModified = new Date().toISOString();
        StateManager.setCurrentList(list);

        // Sauber & sicher: komplette Liste neu zeichnen (verhindert DOM-Dopplung)
        UIManager.refreshListContent();

        // 8) History protokollieren
        HistoryManager.logChange(itemId, 'MOVE', {
            targetItemId,
            position,
            groupSize: this.countSubtree(item) // siehe Helper unten
        });
    },

    countSubtree(node) {
        if (!node || !node.children || node.children.length === 0) return 1;
        let sum = 1;
        for (const c of node.children) sum += this.countSubtree(c);
        return sum;
    },
	
	
	removeItemById(items, itemId) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].id === itemId) {
				return items.splice(i, 1)[0]; // entfernt & zurückgeben
			}

			if (items[i].children) {
				const child = this.removeItemById(items[i].children, itemId);
				if (child) return child;
			}
		}
		return null;
	}
    
};

export function resolveParentHeadlines(item, allItems) {
		let parents = [];
		let current = item;
		while (current.parentId) {
			const parent = allItems.find(it => it.id === current.parentId && ['h1','h2','h3'].includes(it.type) && !it.deleted);
			if (!parent) break;
			parents.unshift(parent); // Von oben nach unten sortieren
			current = parent;
		}
		return parents;
	};

//Findet Vorgänger
export function    findSuccessors(allItems, itemId) {
		return allItems.filter(item =>
			Array.isArray(item.data.dependencies) &&
			item.data.dependencies.some(dep => dep.id === itemId)
		);
	};

	//
export function calcAutoDeadline(item, allItems) {
    // Nur echte Vorgänger mit Datum
    const preds = (item.data.dependencies || []).filter(dep => dep.kind === "predecessor");
    let dates = [];

    preds.forEach(dep => {
        const predItem = allItems.find(i => i.id === dep.id);
        const rawDeadline = predItem?.data?.report_deadline;
        let dt = parseAnyDate(rawDeadline); // <--- NEU

        // Offset anwenden (z. B. +3 Tage)
        if (dt && dep.lag && dep.lag.value) {
            dt = addDuration(dt, dep.lag.value, dep.lag.unit);
        }
        if (dt) dates.push(dt);
    });
    if (!dates.length) return '';

    // Spätestes Datum
    let maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    // Eigene Dauer drauf
    if (item.data.estimated_duration && item.data.estimated_duration.value) {
        maxDate = addDuration(maxDate, item.data.estimated_duration.value, item.data.estimated_duration.unit);
    }

    // Rückgabe als deutsches Format (tt.mm.yyyy)
    return formatGermanDate(maxDate);

    // Hilfsfunktionen

    function parseAnyDate(str) {
        if (!str) return null;
        // ISO (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return new Date(str);
        }
        // Deutsch (TT.MM.JJJJ)
        const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(str);
        if (m) {
            return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        }
        return null; // Nicht erkannt (z.B. "Oktober 2025")
    }

   

};
/**
 * Rekursive Deadline-Berechnung:
 * folgt der kompletten Abhängigkeitskette (nicht nur direkte Vorgänger).
 */
export function calcAutoDeadlineDeep(item, allItems, visited = new Set()) {
    if (visited.has(item.id)) {
        console.warn("Zyklische Abhängigkeit entdeckt:", item.id);
        return null;
    }
    visited.add(item.id);

    const preds = (item.data.dependencies || []).filter(dep => dep.kind === "predecessor");
    let dates = [];

    for (const dep of preds) {
        const predItem = allItems.find(i => i.id === dep.id);
        if (!predItem) continue;

        // Rekursiv: AutoDeadline des Vorgängers holen
        let dt = calcAutoDeadlineDeep(predItem, allItems, visited);
        if (!dt) {
            dt = parseAnyDate(predItem.data.report_deadline);
        }

        // Offset anwenden
        if (dt && dep.lag && dep.lag.value) {
            dt = addDuration(dt, dep.lag.value, dep.lag.unit);
        }

        if (dt) dates.push(dt);
    }

    if (!dates.length) {
        // kein Vorgänger → eigenes Deadline-Datum
        return parseAnyDate(item.data.report_deadline);
    }

    // Spätestes Vorgänger-Datum
    let maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Eigene Dauer addieren
    if (item.data.estimated_duration?.value) {
        maxDate = addDuration(maxDate, item.data.estimated_duration.value, item.data.estimated_duration.unit);
    }

    return maxDate;

    // Hilfsfunktionen
    function parseAnyDate(str) {
        if (!str) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str);
        const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(str);
        if (m) return new Date(+m[3], +m[2]-1, +m[1]);
        return null;
    }
    function addDuration(dt, value, unit) {
        const d = new Date(dt);
        value = Number(value) || 0;
        switch(unit) {
            case 'd': d.setDate(d.getDate() + value); break;
            case 'w': d.setDate(d.getDate() + value*7); break;
            case 'm': d.setMonth(d.getMonth() + value); break;
            case 'y': d.setFullYear(d.getFullYear() + value); break;
        }
        return d;
    }
}

export function calcAutoDeadlineDetails(item, allItems) {
    // Nur echte Vorgänger mit Datum
    const preds = (item.data.dependencies || []).filter(dep => dep.kind === "predecessor");
    let maxPred = null;
    let maxDate = null;
    let maxDepLag = null;

    preds.forEach(dep => {
        const predItem = allItems.find(i => i.id === dep.id);
        const rawDeadline = predItem?.data?.report_deadline;
        let dt = parseAnyDate(rawDeadline);
        // Offset
        if (dt && dep.lag && dep.lag.value) {
            dt = addDuration(dt, dep.lag.value, dep.lag.unit);
        }
        if (dt && (!maxDate || dt > maxDate)) {
            maxDate = dt;
            maxPred = predItem;
            maxDepLag = dep.lag;
        }
    });

    let afterVorgaenger = maxDate ? new Date(maxDate) : null;
    let ownDuration = (item.data.estimated_duration && item.data.estimated_duration.value)
        ? { ...item.data.estimated_duration }
        : null;
    let deadline = maxDate;
    if (ownDuration && deadline) {
        deadline = addDuration(deadline, ownDuration.value, ownDuration.unit);
    }
console.log("Item dependencies:", item.data.dependencies);
console.log("Preds found:", preds);
    return {

		

        vorgaenger: maxPred,
        vorgaengerDeadline: maxDate ? formatGermanDate(maxDate) : null,
        vorgaengerOffset: maxDepLag,
        eigeneDauer: ownDuration,
        deadline: deadline ? formatGermanDate(deadline) : null
    };

    function parseAnyDate(str) {
        if (!str) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return new Date(str);
        }
        const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(str);
        if (m) {
            return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        }
        return null;
    }
    function addDuration(dt, value, unit) {
        const d = new Date(dt);
        value = Number(value) || 0;
        switch(unit) {
            case 'd': d.setDate(d.getDate() + value); break;
            case 'w': d.setDate(d.getDate() + value * 7); break;
            case 'm': d.setMonth(d.getMonth() + value); break;
            case 'y': d.setFullYear(d.getFullYear() + value); break;
        }
        return d;
    }
    
};

export function calcEarliestStart(item, allItems) {
    // Alle Vorgänger finden
    const preds = (item.data.dependencies || []).filter(dep => dep.kind === "predecessor");
    let maxDate = null;

    preds.forEach(dep => {
        const predItem = allItems.find(i => i.id === dep.id);
        let dt = parseAnyDate(predItem?.data?.report_deadline);
        // Lag berücksichtigen
        if (dt && dep.lag && dep.lag.value) {
            dt = addDuration(dt, dep.lag.value, dep.lag.unit);
        }
        if (dt && (!maxDate || dt > maxDate)) {
            maxDate = dt;
        }
    });

    // Wenn keine Vorgänger → kein Frühester Anfang beschränkt
    return maxDate ? formatGermanDate(maxDate) : '';
};

/**
 * Berechnet den spätesten Anfang (startSA) eines Vorgangs
 * @param {object} item      Das aktuelle Item (Vorgang)
 * @returns {string}         Datums-String im Format DD.MM.YYYY oder leer
 */
export function calcLatestStart(item) {
    let dt = parseAnyDate(item.data.report_deadline);
    const dur = item.data.estimated_duration;
    if (dt && dur && dur.value) {
        dt = addDuration(dt, -Math.abs(Number(dur.value)), dur.unit);
    }
    return dt ? formatGermanDate(dt) : '';
};


// Hilfsfunktionen (wie bei calcAutoDeadline)
function parseAnyDate(str) {
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str);
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(str);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return null;
}


	
    function addDuration(dt, value, unit) {
        const d = new Date(dt);
        value = Number(value) || 0;
        switch(unit) {
            case 'd': d.setDate(d.getDate() + value); break;
            case 'w': d.setDate(d.getDate() + value * 7); break;
            case 'm': d.setMonth(d.getMonth() + value); break;
            case 'y': d.setFullYear(d.getFullYear() + value); break;
        }
        return d;
    }