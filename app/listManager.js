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
import { generateUUID, formatDate} from './utils.js'

import { UIManager, showConfirmDialog, PhaseHelper } from './uiManager.js';
import { SettingsManager } from './settingsManager.js';
import { DebugLogger } from './debugLogger.js';

export const ListManager = {
    async showListModal() {

        // Phasen aus der Config holen
        const phases = await SettingsManager.getSetting("lists_phase");

        // Options dynamisch erzeugen
        let optionsHtml = `<option value="">Bitte auswählen</option>`;
        if (phases) {
            Object.entries(phases).forEach(([code, label]) => {
                optionsHtml += `<option value="${code}">${code}. ${label}</option>`;
            });
        }   

		const modalContent = `
          <form id="list-form">
                <div class="mb-3">
                    <label class="form-label">Listenname <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="list-name" required>
                    <div class="invalid-feedback">Bitte geben Sie einen Listenname ein</div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Beschreibung</label>
                    <textarea class="form-control" id="list-description" rows="2"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Phase <span class="text-danger">*</span></label>
                    <select class="form-select" id="list-phase" required>
                        ${optionsHtml}

                    </select>
                    <div class="invalid-feedback">Bitte wählen Sie eine Phase aus</div>
                </div>
            </form>
         `;
		const handleSubmit =(e) => {
			if (e) e.preventDefault();
			
			const form = document.getElementById('list-form');
			if(!form) return false;
			
			
			//Zugriff auf die Felder erfolgt erst beim Klick
			 // Zugriff auf die Felder erfolgt erst beim Klick
            
            const nameInput = form.querySelector('#list-name');
            const phaseSelect = form.querySelector('#list-phase');
            const description = form.querySelector('#list-description').value;

            let isValid = true;

            // Validierung
            if (!nameInput.value.trim()) {
                nameInput.classList.add('is-invalid');
                isValid = false;
            } else {
                nameInput.classList.remove('is-invalid');
            }

            if (!phaseSelect.value) {
                phaseSelect.classList.add('is-invalid');
                isValid = false;
            } else {
                phaseSelect.classList.remove('is-invalid');
            }

            if (isValid) {
                ListManager.createList(
                    nameInput.value.trim(),
                    description,
                    phaseSelect.value
                );
                return true; // Schließt das Modal
            }
            return false; // Behält das Modal offen
        };

        UIManager.showModal(
            'Neue Liste',
            modalContent,
            handleSubmit //.bind(this) // Korrekter this-Kontext
        );
    },


   
	createList(name, description, phase) {
		const project = StateManager.getCurrentProject();
		if(!project) {
			UIManager.showToast("Kein Projekt geladen", "error");
			return null;
		}
		
		const listId = generateUUID();
		const list = {
			meta: {
				id: listId,
				name,
				description,
				phase,
				created: new Date().toISOString(),
				lastModified: new Date().toISOString(),
				version: 1.0,
				finalized: false
			},
			items: []
		};
		
		StateManager.updateProject(project => {
			project.lists = project.lists || {};
			project.manifest.lists = project.manifest.lists || [];
			project.finalizedLists = project.finalizedLists || [];
			
			project.lists[listId] = list;
			project.manifest.lists.push({
				id: listId,
				name,
				phase,
				finalized: false
			});
			
			return project;
		});
		
		// Direkte UI-Aktualisierung mit der neuen Liste
		StateManager.setCurrentList(list);
		UIManager.updateLists(StateManager.getAllLists());
		UIManager.showToast(`Liste "${name}" erstellt`, 'success');
		return list;
	},
		
	finalizeCurrentList() {
		const list = StateManager.getAllLists();
		if (!list) return;
		
        StateManager.updateProject(project => {
			if (!project.finalizedLists) project.finalizedLists = [];
			
            if (!project.finalizedLists.includes(list.meta.id)) {
                project.finalizedLists.push(list.meta.id);
                list.meta.finalized = true;
				list.meta.lastModified = new Date().toISOString();
            }
            return project;
        });
		UIManager.disableEditing();
		UIManager.showToast(`Liste "${list.meta.name}" finalisiert`, 'success');
    },
    
	
    softDeleteList(listId) {
        StateManager.updateProject(project => {
            const list = project?.lists?.[listId];
            if (!list) return project;

            list.meta = list.meta || {};
            list.meta.isDeleted = true;
            list.meta.deletedAt = new Date().toISOString();
            list.meta.lastModified = new Date().toISOString();

            const manifestEntry = project?.manifest?.lists?.find(entry => entry.id === listId);
            if (manifestEntry) {
                manifestEntry.isDeleted = true;
                manifestEntry.deletedAt = list.meta.deletedAt;
            }

            return project;
        });

        UIManager.updateLists(StateManager.getCurrentProject().lists);
        UIManager.showToast('Liste als gelöscht markiert', 'success');
    },

    restoreList(listId) {
        StateManager.updateProject(project => {
            const list = project?.lists?.[listId];
            if (!list) return project;

            list.meta = list.meta || {};
            list.meta.isDeleted = false;
            delete list.meta.deletedAt;
            list.meta.lastModified = new Date().toISOString();

            const manifestEntry = project?.manifest?.lists?.find(entry => entry.id === listId);
            if (manifestEntry) {
                manifestEntry.isDeleted = false;
                delete manifestEntry.deletedAt;
            }

            return project;
        });

        UIManager.updateLists(StateManager.getCurrentProject().lists);
        UIManager.showToast('Liste wiederhergestellt', 'success');
    },

    deleteListPermanently(listId) {
        StateManager.updateProject(project => {
            project.manifest.lists = (project.manifest.lists || []).filter(list => list.id !== listId);
            delete project.lists[listId];
            project.finalizedLists = (project.finalizedLists || []).filter(id => id !== listId);
            if (project.snapshots) {
                delete project.snapshots[listId];
            }
            return project;
        });

        UIManager.updateLists(StateManager.getCurrentProject().lists);
        UIManager.showToast('Liste endgültig gelöscht', 'success');

    },
    
    isListFinalized(listId) {
        const project = StateManager.getCurrentProject();
        return project?.finalizedLists?.includes(listId) || false;
    },


    /* LISTEN MODAL */
     async showListOverviewModal() {
        const project = StateManager.getCurrentProject();
        const listsObj = project?.lists || {};

        // Herausfiltern ungültiger Listen
        const validLists = Object.values(listsObj).filter(list => list?.meta?.created);

        // Sortieren (letzte Änderung oben)
        const sortedLists = validLists.sort((a, b) =>
            new Date(b.meta.updated) - new Date(a.meta.updated)
        );

        // Tabellenzeilen bauen
        let rows = '';

        if (sortedLists.length === 0) {
            rows = `<tr><td colspan="6" class="text-muted">Keine Listen vorhanden.</td></tr>`;
        } else {
            sortedLists.forEach(async list => {
                const id = list.meta.id;
                const name = list.meta.name || '–';
                const desc = list.meta.description || '';
                const phase = list.meta.phase || '';
                const created = formatDate(list.meta.created);
                const updated = formatDate(list.meta.updated || list.meta.created);
                const phaseLabel = PhaseHelper.getPhaseName(phase);

                rows += `
                    <tr data-id="${id}">
                        <td>${name}</td>
                        <td>${desc}</td>
                        <td><span class="badge phase-${phase}">${phaseLabel}</span></td>
                        <td>${created}</td>
                        <td>${updated}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-secondary act-open" title="Öffnen">
                                    <i class="bi bi-folder2-open"></i>
                                </button>

                                <button class="btn btn-outline-secondary act-edit" title="Bearbeiten">
                                    <i class="bi bi-pencil"></i>
                                </button>

                                <button class="btn btn-outline-danger act-delete" title="Löschen">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        // Modal HTML
        const modalContent = `
            <div class="table-responsive">
                <table class="table table-sm align-middle">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Beschreibung</th>
                            <th>Phase</th>
                            <th>Erstellt</th>
                            <th>Letzte Änderung</th>
                            <th>Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        // Anzeigen
        UIManager.showModal(
            'Listenübersicht',
            modalContent,
            null,
            'xl',
            () => ListManager._wireListOverviewHandlers()
        

        );
    },

    _wireListOverviewHandlers() {

          DebugLogger.log('%c[Modal] _wireListOverviewHandlers gestartet', 'color: limegreen');

        const modalBody = document.getElementById('modalBody');
        DebugLogger.log('[Modal] modalBody gefunden:', modalBody);
        if (!modalBody) return;

        const rows = modalBody.querySelectorAll('tbody tr[data-id]');
        DebugLogger.log('[Modal] Tabellenzeilen gefunden:', rows.length);

        
       

        
        rows.forEach(row => {
            const id = row.getAttribute('data-id');
            const list = StateManager.getListById(id); // Diese Methode solltest du ggf. bereitstellen

            // Klick auf ganze Zeile (außer Buttons)
            row.addEventListener('click', (e) => {
                if (e.target.closest('button')) return; // Buttons separat behandeln

                StateManager.setCurrentList(list);
                //ListManager.highlightSelectedList(list.meta.id);
                UIManager.updateListContent(list);
                UIManager.updateSnapshotsForList(list.meta.id);

                UIManager.closeModal();
            });


            // Klick auf „Löschen“-Button
            const btnDelete = row.querySelector('.act-delete');
            if (btnDelete) {
            btnDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!confirm(`Liste "${list.meta.name}" wirklich löschen?`)) return;

                const deletedId = list.meta.id;

                // war die gelöschte Liste aktuell ausgewählt?
                const current = StateManager.getCurrentList?.();
                const wasCurrent = current && current.meta?.id === deletedId;

                // 1) löschen
                this.softDeleteList(deletedId);

                // 2) neuen Zustand bestimmen (falls die aktive Liste gelöscht wurde)
                if (wasCurrent) {
                const all = StateManager.getLists?.() || [];
                const fallback = all.find(l => l.meta?.id !== deletedId);
                if (fallback) {
                    StateManager.setCurrentList?.(fallback);
                } else {
                    // keine Listen mehr → View leeren
                    StateManager.setCurrentList?.(null);
                }
                }

                // 3) UI sauber neu aufbauen (nichts mit dem gelöschten "list" rendern!)
                // Sidebar/Listen-Overview neu rendern
                UIManager.renderListsOverview?.();

                // Hauptbereich
                const cur = StateManager.getCurrentList?.();
                if (cur) {
                UIManager.updateListContent?.(cur);           // Titel + Items
                UIManager.updateSnapshotsForList?.(cur.meta.id);
                UIManager.enableListActions?.(true);
                } else {
                UIManager.clearListView?.();                  // Titel/Items leeren
                UIManager.enableListActions?.(false);
                }

                // 4) Modal neu laden (erst NACH dem Refresh)
                this.showListOverviewModal();
            });
            }

            // Klick auf „Bearbeiten“-Button (Platzhalter)
            const btnEdit = row.querySelector('.act-edit');
            if (btnEdit) {
                btnEdit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    alert(`Bearbeiten von: ${list.meta.name} (noch nicht implementiert)`);
                });
            }

            // Klick auf „Öffnen“-Button (funktioniert wie Zeilenklick)
            const btnOpen = row.querySelector('.act-open');
            if (btnOpen) {
                btnOpen.addEventListener('click', (e) => {
                    e.stopPropagation();

                    StateManager.setCurrentList(list);
                    //ListManager.highlightSelectedList(list.meta.id);
                    UIManager.updateListContent(list);
                    UIManager.updateSnapshotsForList(list.meta.id);

                    UIManager.closeModal();
                });
            }
        });
    }







};
