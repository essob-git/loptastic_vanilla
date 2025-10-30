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
import { generateUUID, deepClone } from './utils.js'
import { UIManager } from './uiManager.js';

export const SnapshotManager2 = {
    showSnapshotModal() {
        const modalContent = `
            <form id="snapshot-form">
                <div class="mb-3">
                    <label class="form-label">Name des Snapshots <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="snapshot-name" required>
                    <div class="invalid-feedback">Bitte geben Sie einen Namen ein</div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Anmerkungen (optional)</label>
                    <textarea class="form-control" id="snapshot-note" rows="2"></textarea>
                </div>
            </form>
        `;

        const handleSubmit = (e) => {
            if (e) e.preventDefault();
            const form = document.getElementById('snapshot-form');
            if (!form) return false;

            const nameInput = form.querySelector('#snapshot-name');
            const noteInput = form.querySelector('#snapshot-note');

            let isValid = true;

            if (!nameInput.value.trim()) {
                nameInput.classList.add('is-invalid');
                isValid = false;
            } else {
                nameInput.classList.remove('is-invalid');
            }

            if (isValid) {
                SnapshotManager2.takeSnapshot(
					nameInput.value.trim(), 
					noteInput.value.trim()
				);
				
                return true;
            }
            return false;
        };

        UIManager.showModal(
			'Snapshot erstellen', 
			modalContent,
			handleSubmit
		);
    },

    takeSnapshot(name, note) {
        const list = StateManager.getCurrentList();
        if (!list) return;

        const snapshot = {
            id: generateUUID(),
            name,
            note,
            date: new Date().toISOString(),
            data: deepClone(list)
        };

        StateManager.updateProject(project => {
            if (!project.snapshots) project.snapshots = {};
            if (!project.snapshots[list.meta.id]) project.snapshots[list.meta.id] = [];
            project.snapshots[list.meta.id].push(snapshot);
            return project;
        });

        UIManager.addSnapshotToUI(snapshot);
        UIManager.showToast('Snapshot erstellt', 'success');
    },
	
	loadSnapshot(snapshot) {
		if (!snapshot || !snapshot.data) return;

		// Schreibgeschützte Kopie der Snapshot-Liste
		const cloned = deepClone(snapshot.data);

		// Marker setzen
		cloned.meta.isSnapshotView = true;
		cloned.meta.snapshotMeta = {
			id: snapshot.id,
			name: snapshot.name,
			note: snapshot.note,
			date: snapshot.date
		};

		// Aktuelle Liste als temporäre Snapshot-Ansicht setzen
		StateManager.setCurrentList(cloned);

		// UI sperren
		UIManager.setReadOnlyMode(true, cloned.meta.snapshotMeta.name);
    },
    
    deleteSnapshot(listId, snapshotId) {
        StateManager.updateProject(project => {
            if (project.snapshots?.[listId]) {
                project.snapshots[listId] = project.snapshots[listId]
                    .filter(s => s.id !== snapshotId);
            }
            return project;
        });
        
        UIManager.removeSnapshotFromUI(snapshotId);
        UIManager.showToast('Snapshot gelöscht', 'success');
    }
};