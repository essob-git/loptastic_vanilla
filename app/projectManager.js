/**
 * Listify - Projektmanagement Tool
 * Copyright (c) 2025 Sven Bosse
 *
 * Diese Datei ist Teil von Listify.
 * 
 * Lizenz: MIT (https://opensource.org/licenses/MIT)
 * 
 * Hinweis:
 * - Nutzung, Veränderung und Weitergabe sind unter Beachtung der Lizenz erlaubt.
 * - Externe Bibliotheken behalten ihre eigenen Lizenzen.
 */

//import JSZip from 'jszip';
import { StateManager, formatDate, generateUUID } from './app.js';
import { UIManager } from './uiManager.js';
import { Programm, compareVersions } from './programm.js';
import { HelperManager } from './helperManager.js';

export const ProjectManager = {


	async createNewProject() {
        // Zeige Modal zur Eingabe der Stammdaten
        
 
        return new Promise((resolve) => {

            
            UIManager.showModal('Neues Projekt anlegen', `
                <div class="mb-3">
                    <label class="form-label">Projektname <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="project-name" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Beschreibung</label>
                    <textarea class="form-control" id="project-description" rows="2"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">SAP Nummer</label>
                    <input type="text" class="form-control" id="project-sap">
                </div>
                <div class="mb-3">
                    <label class="form-label">IPS Nummer</label>
                    <input type="text" class="form-control" id="project-wnum">
                </div>
                <div class="mb-3">
                    <label class="form-label">Projektleiter</label>
                    <input type="text" class="form-control" id="project-leader">
                </div>
            `, () => {
				
				// Datenvalidierung
				const validateInput = (inputId, errorMessage) => {
					const input = document.getElementById(inputId);
					if (!input.value.trim()) {
						input.classList.add('is-invalid');
						const errorEl = document.createElement('div');
						errorEl.className = 'invalid-feedback';
						errorEl.textContent = errorMessage;
						input.parentNode.appendChild(errorEl);
						return false;
					}
					return true;
				};

				if (!validateInput('project-name', 'Bitte geben Sie einen Projektnamen ein')) {
					return false;
				}
				
				
                const name = document.getElementById('project-name').value.trim();
                /**
				if (!name) {
                    document.getElementById('project-name').classList.add('is-invalid');
                    return;
                }
				**/

                const projectData = {
                    name,
                    description: document.getElementById('project-description').value,
                    sapNummer: document.getElementById('project-sap').value,
                    wNummer: document.getElementById('project-wnum').value,
                    projectLeader: document.getElementById('project-leader').value
                };

                const project = {
                    manifest: {
                        version: Programm.getVersion(),
                        created: new Date().toISOString(),
                        project: projectData,
                        lists: [],
                        exports: []
                    },
                    settings: {},
                    lists: {},
                    finalizedLists: [],
                    changelog: {},
					templates: {},
					snapshots: {},
                };

                StateManager.setCurrentProject(project);
                UIManager.showToast('Neues Projekt erstellt', 'success');
                resolve(project);
            });

          
        });
    },
	
  async openProject() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.lop';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            let content;
				try {
					const zip = new JSZip();
					content = await zip.loadAsync(file);
				} catch (loadError) {
					console.error('ZIP konnte nicht geladen werden:', loadError);
					UIManager.showToast('Datei ist beschädigt oder kein gültiges Projekt.', 'error');
					resolve(null);
					return;
				}

            try {
				 
               // Manifest
				
                const manifestText = await content.file('manifest.json')?.async('string');
                if (!manifestText) throw new Error('Manifest fehlt');
                const manifest = JSON.parse(manifestText);
                UIManager.showToast('Manifest geladen', 'success');

                            
                // Version check
                const fileVersion = manifest.version || "0.0.0";
                const currentVersion = Programm.getVersionNumber();

                const cmp = compareVersions(fileVersion, currentVersion);

                if (cmp > 0) {
                    // Datei wurde mit einer neueren Programmversion gespeichert
                    UIManager.showToast(
                        `⚠️ Dieses Projekt (${fileVersion}) ist neuer als deine Programmversion (${currentVersion}).`,
                        'error'
                    );
                    resolve(null); return;
                } else if (cmp < 0) {
                    // Datei ist älter
                    UIManager.showToast(
                        `Projektversion ${fileVersion} geladen. Deine Version ist ${currentVersion}.`,
                        'info'
                    );

                } else {
                    // exakt gleiche Version
                    UIManager.showToast(`Projektversion ${fileVersion} geladen.`, 'success');
                }




                
				// Listen
				console.log('Lade Listen aus ZIP');

				const lists = {};
				const listFolder = content.folder('lists');
				if (listFolder) {
					const listFiles = [];
					listFolder.forEach((relativePath, file) => {
						if (
							relativePath.endsWith('.json') &&
							!relativePath.includes('status/')
						) {
							listFiles.push(relativePath);
						}
					});

					console.log('Gefundene Listendateien:', listFiles);

					for (const filePath of listFiles) {
						const fileEntry = listFolder.file(filePath); // Korrekt: Zugriff relativ zum Ordner
						if (fileEntry) {
							try {
								const listData = await fileEntry.async('string');
								const listName = filePath.split('/').pop().replace('.json', '');
								lists[listName] = JSON.parse(listData);

                                
								console.log(`Liste geladen: ${listName}`, lists[listName]);
							} catch (err) {
								console.warn(`Fehler beim Lesen der Datei ${filePath}:`, err);
							}
						} else {
							console.warn('Listendatei fehlt im listFolder:', filePath);
						}
					}
				} else {
					console.warn('Ordner "lists" nicht gefunden');
				}

				UIManager.showToast('Listen geladen', 'success');


                // Finalisierte Listen
                const finalizedLists = [];
                const statusFolder = content.folder('lists/status');
                if (statusFolder) {
                    statusFolder.forEach((relativePath, file) => {
                        if (relativePath.endsWith('.final')) {
                            finalizedLists.push(relativePath.split('/').pop().replace('.final', ''));
                        }
                    });
                }
                UIManager.showToast('Finale Listen geladen', 'success');

                // Changelog
				
               const changelog = {};

				const changelogFolder = content.folder('changelog/items');

				if (changelogFolder) {
					const logFilePaths = Object.keys(content.files).filter(
						path => path.startsWith('changelog/items/') && path.endsWith('.json')
					);

					for (const filePath of logFilePaths) {
						try {
							const logData = await content.file(filePath).async('string');
							const itemId = filePath.split('/').pop().replace('.json', '');
							changelog[itemId] = JSON.parse(logData);
						} catch (e) {
							console.warn(`Fehler beim Lesen der Änderungsdatei ${filePath}`, e);
						}
					}
				}
                UIManager.showToast('Changelog geladen', 'success');
	
				// Snapshots
				const snapshots = {};
				const snapshotRoot = content.folder('lists/snapshots');
				if (snapshotRoot) {
					const listIds = Object.keys(content.files)
						.filter(path => path.startsWith('lists/snapshots/') && path.endsWith('.json'))
						.map(path => path.split('/')[2]);

					const uniqueListIds = [...new Set(listIds)];

					for (const listId of uniqueListIds) {
						const listFolder = snapshotRoot.folder(listId);
						const filePaths = [];

						listFolder.forEach((relativePath, file) => {
							if (relativePath.endsWith('.json')) {
								filePaths.push(relativePath);
							}
						});

						snapshots[listId] = [];

						for (const fileName of filePaths) {
							try {
								const file = listFolder.file(fileName);
								if (!file) continue;

								const raw = await file.async('string');
								const snapshot = JSON.parse(raw);
								snapshots[listId].push(snapshot);
							} catch (e) {
								console.warn(`Fehler beim Lesen von Snapshot ${fileName}`, e);
							}
						}
					}
				}

 
                // Einstellungen
                let settings = {};
                if (content.file('settings.json')) {
                    const settingsText = await content.file('settings.json').async('string');
                    settings = JSON.parse(settingsText);
                }
                UIManager.showToast('Einstellungen geladen', 'success');

                // Vorlagen
                const templates = {};
                const templatesFolder = content.folder('templates');
                if (templatesFolder) {
                    const templateFiles = [];
                    templatesFolder.forEach((relativePath, file) => {
                        if (relativePath.endsWith('.json')) {
                            templateFiles.push(relativePath);
                        }
                    });

                    for (const filePath of templateFiles) {
                        const templateData = await content.file(`templates/${filePath}`)?.async('string');
                        if (templateData) {
                            const templateName = filePath.split('/').pop().replace('.json', '');
                            templates[templateName] = JSON.parse(templateData);
                        }
                    }
                }
                UIManager.showToast('Vorlagen geladen', 'success');

                // Projekt zusammensetzen
                const project = {
                    manifest,
                    settings,
                    lists,
                    finalizedLists,
                    changelog,
                    templates,
					snapshots
                };
                StateManager.setCurrentList(null); //Reset des StateManagers. Wichtig beim laden, wenn bereits vorher ein Projekt gealden wurde

				console.log('Projekt gesetzt:', project);
                StateManager.setCurrentProject(project);
				UIManager.updateLists(lists);



                
                UIManager.showToast('Projekt erfolgreich geladen', 'success');
				console.log('StateManager.currentProject:', StateManager.getCurrentProject());

                resolve(project);
			
            } catch (error) {
                console.error('Fehler beim Laden des Projekts:', error);
                UIManager.showToast('Fehler beim Verarbeiten des Projekts', 'error');
                resolve(null);
            }
        };

        input.click();
    });
},

    
    async saveProject() {
        const project = StateManager.getCurrentProject();
        //if (!project) return;
        if (!project) {
			throw new Error('Kein Projekt zum Speichern vorhanden');
		}
        try {
            const zip = new JSZip();
            
            // Manifest hinzufügen
              // Version vor dem Schreiben aktualisieren
            project.manifest.version = Programm.getVersionNumber();
            zip.file('manifest.json', JSON.stringify(project.manifest, null, 2));
            
            // Einstellungen hinzufügen
            zip.file('settings.json', JSON.stringify(project.settings || {}, null, 2));
            
            // Listen hinzufügen
            const listFolder = zip.folder('lists');
            Object.entries(project.lists).forEach(([name, data]) => {
                listFolder.file(`${name}.json`, JSON.stringify(data, null, 2));
            });
            
            // Final-Status hinzufügen
            const statusFolder = zip.folder('lists/status');
            project.finalizedLists.forEach(listName => {
                statusFolder.file(`${listName}.final`, '');
            });
            
            
            // Changelog hinzufügen
            const changelogFolder = zip.folder('changelog/items');
            Object.entries(project.changelog).forEach(([itemId, logs]) => {
                changelogFolder.file(`${itemId}.json`, JSON.stringify(logs, null, 2));
            });
			
			// Snapshots
			const snapshotRoot = zip.folder('lists/snapshots');
			if (project.snapshots) {
				for (const [listId, snapshotList] of Object.entries(project.snapshots)) {
					const listFolder = snapshotRoot.folder(listId);
					snapshotList.forEach(snapshot => {
						listFolder.file(`${snapshot.id}.json`, JSON.stringify(snapshot, null, 2));
					});
				}
			}
            
            // Vorlagen hinzufügen
            const templatesFolder = zip.folder('templates');
            Object.entries(project.templates).forEach(([name, template]) => {
                templatesFolder.file(`${name}.json`, JSON.stringify(template, null, 2));
            });
            
            // PDF-Exporte hinzufügen (nur als Platzhalter)
            const exportsFolder = zip.folder('exports/pdf');
            project.manifest.exports?.forEach(exp => {
                exportsFolder.file(exp.path.split('/').pop(), '');
            });
            
            // ZIP generieren und herunterladen
            const blob = await zip.generateAsync({type: 'blob'});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            //link.download = `${project.manifest.project.name.replace(/[^a-z0-9]/gi, '_')}.lop`;
            const pad = n => String(n).padStart(2, '0');
            const now = new Date();
            const datePrefix = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_`;

            const safeName = (project?.manifest?.project?.name ?? 'Projekt')
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')   // Diakritika (ä→a) entfernen
            .replace(/[^a-z0-9]+/gi, '_')                        // auf _/Alnum begrenzen
            .replace(/^_+|_+$/g, '');                            // Rand-Underscores trimmen

            link.download = `${datePrefix}${safeName}.lop`;
            link.click();
            
            UIManager.showToast('Projekt erfolgreich gespeichert', 'success');
        } catch (error) {
            console.error('Fehler beim Speichern des Projekts:', error);
            UIManager.showToast('Fehler beim Speichern', 'error');
        }
    }
};