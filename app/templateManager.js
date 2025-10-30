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

import { StateManager } from './app.js';
import { generateUUID } from './utils.js'
import { ItemManager } from './itemManager.js';
import { UIManager, PhaseHelper} from './uiManager.js';

export const TemplateManager = {
    templates: {},

	loadTemplates() {
		this.templates = {}; // nur manuelle Auswahl
		this.updateTemplateSelect();
	},
	
	loadExternalTemplate(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (event) => {
				try {
					const template = JSON.parse(event.target.result);

					if (!template.name || !Array.isArray(template.items)) {
						throw new Error('Ungültiges Template-Format');
					}

					const id = generateUUID();
					this.templates = {}; // nur eine aktive Vorlage
					this.templates[id] = template;
					
					this.updateTemplateSelect();
					
					//UIManager.showToast(`Vorlage "${template.name}" geladen`, 'success');
					//resolve(template);
					
					//setze das Select-Feld auf die neue ID
					const select = document.getElementById('template-select');
					if (select) select.value = id;

					UIManager.showToast(`Vorlage "${template.name}" geladen`, 'success');
					resolve(template);
				} catch (e) {
					UIManager.showToast('Fehlerhafte Template-Datei', 'error');
					reject(e);
				}
			};

			reader.onerror = () => {
				UIManager.showToast('Fehler beim Lesen der Datei', 'error');
				reject(reader.error);
			};

			reader.readAsText(file);
		});
	},
	
    loadProjectTemplates(project) {
        if (project?.templates) {
            this.templates = { ...project.templates };
            this.updateTemplateSelect();
        }
    },
    

    updateTemplateSelect() {
        const select = document.getElementById('template-select');
        select.innerHTML = '<option value="">Vorlage auswählen</option>';
        
        Object.entries(this.templates).forEach(([id, template]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${template.name} - ${template.description}`;
            select.appendChild(option);
        });
    },
    
    async applySelectedTemplate() {
        const select = document.getElementById('template-select');
        const templateId = select.value;
        if (!templateId) return;
        
        const template = this.templates[templateId];
        if (!template) return;
        
        // Füge jedes Item der Vorlage zur aktuellen Liste hinzu
        /** Hotfix #19 2025-10-15 ALt:
        template.items.forEach(itemData => {
            this.addTemplateItem(itemData);
        });
        **/
        for (const itemData of template.items) {
            await this.addTemplateItem(itemData);
        }

        UIManager.refreshListContent();
        UIManager.showToast(`Vorlage "${template.name}" angewendet`, 'success');
    },
    
    async addTemplateItem(itemData, parentId = null) {
        // Ersetze Platzhalter in den Daten
            /* Hotfix #19 2025-10-15 
            const replacedData = this.replacePlaceholders(itemData.data);
            */
            const replacedData = await this.replacePlaceholders(itemData.data);

        // Neues Element erstellen
        const newItem = ItemManager.addItem(itemData.type, parentId, replacedData);

        /* Hotfix #19 2025-10-15
        if (newItem) {
            // Kinder rekursiv hinzufügen
                
                if (itemData.children && itemData.children.length > 0) {
                    itemData.children.forEach(childData => {
                        this.addTemplateItem(childData, newItem.id);
                    });
                }
            } 
        */
        if (newItem && itemData.children?.length) {
            for (const childData of itemData.children) {
                await this.addTemplateItem(childData, newItem.id);
            }
        }
    },
    
    async replacePlaceholders(data) {
        const project = StateManager.getCurrentProject();
        const list = StateManager.getCurrentList();
        
        const replacements = {
            '{nummer}': this.getNextItemNumber(),
            '{datum}': new Date().toLocaleDateString('de-DE'),
            '{heute}': new Date().toLocaleDateString('de-DE'),
            '{verantwortlich}': project?.manifest.project.projectLeader || '',
            '{PL}': project?.manifest.project.projectLeader || '',
            '{projekt}': project?.manifest.project.name || '',
            '{liste}': list?.meta.name || '',
            /* 
              Hotfix #19 2025-10-15 Alt:
              '{phase}': await UIManager.getPhaseName(list?.meta.phase)
               Umstellung auf den PhaseHelper
            */
            '{phase}' : PhaseHelper.getPhaseName(list?.meta.phase)
        };
        
        const replaced = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                let newValue = value;
                for (const [placeholder, replacement] of Object.entries(replacements)) {
                    newValue = newValue.split(placeholder).join(replacement);
                }
                replaced[key] = newValue;
            } else {
                replaced[key] = value;
            }
        }
        return replaced;
    },
    
    getNextItemNumber() {
        const list = StateManager.getCurrentList();
        if (!list) return '001';
        
        // Finde die höchste vorhandene Nummer
        let maxNumber = 0;
        const regex = /(\d+)/;
        
        const traverseItems = (items) => {
            items.forEach(item => {
                const match = item.data.report_id?.match(regex);
                if (match) {
                    const num = parseInt(match[0]);
                    if (num > maxNumber) maxNumber = num;
                }
                if (item.children) traverseItems(item.children);
            });
        };
        
        traverseItems(list.items);
        return (maxNumber + 1).toString().padStart(3, '0');
    },
    
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
    
    async importTemplate() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                if (e.target.files.length === 0) return;
                
                try {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    
                    reader.onload = async (event) => {
                        try {
                            const template = JSON.parse(event.target.result);
                            
                            // Validierung
                            if (!template.name || !template.items) {
                                throw new Error('Ungültiges Vorlagenformat');
                            }
                            
                            const templateId = generateUUID();
                            
                            StateManager.updateProject(project => {
                                if (!project.templates) project.templates = {};
                                project.templates[templateId] = template;
                                return project;
                            });
                            
                            this.templates[templateId] = template;
                            this.updateTemplateSelect();
                            
                            UIManager.showToast('Vorlage erfolgreich importiert', 'success');
                            resolve(template);
                        } catch (error) {
                            console.error('Fehler beim Parsen der Vorlage:', error);
                            UIManager.showToast('Ungültiges Vorlagenformat', 'error');
                            resolve(null);
                        }
                    };
                    
                    reader.readAsText(file);
                } catch (error) {
                    console.error('Fehler beim Import der Vorlage:', error);
                    UIManager.showToast('Fehler beim Import', 'error');
                    resolve(null);
                }
            };
            
            input.click();
        });
    },
    exportTemplateFromCurrentList() {
        const list = StateManager.getCurrentList();
        if (!list) {
            UIManager.showToast("Keine Liste ausgewählt", "error");
            return;
        }

        // Modal anzeigen
        UIManager.showModal("Vorlage exportieren", `
            <div class="mb-3">
                <label class="form-label">Dateiname</label>
                <div class="input-group">
                    <input type="text" class="form-control" placeholder="Dateiname" aria-label="Dateiname" aria-describedby="basic-addon2"  id="tpl-filename" value="${list.meta.name || 'Vorlage'}">
                    <span class="input-group-text" id="basic-addon2">.json</span>
                </div>
            </div>

          
            <div class="mb-3">
                <label class="form-label">Vorlagenname</label>
                <input type="text" class="form-control" id="tpl-name" value="${list.meta.name || ''}">
            </div>
            <div class="mb-3">
                <label class="form-label">Beschreibung</label>
                <textarea class="form-control" id="tpl-desc" rows="3">${list.meta.description || ''}</textarea>
            </div>
            <hr>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="tpl-keep-responsible" checked>
                <label class="form-check-label" for="tpl-keep-responsible">
                Verantwortliche in Vorlage übernehmen
                </label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="tpl-keep-duration" checked>
                <label class="form-check-label" for="tpl-keep-duration">
                Dauer-Werte in Vorlage übernehmen
                </label>
            </div>
            <hr>
<div class="alert alert-info small mt-3">
  <strong>Hinweise zum Template-Export:</strong>
  <ul class="mb-0">
    <li>Struktur zuerst wie gewünscht anlegen (Headlines &amp; Unterpunkte).</li>
    <li>Verwende Platzhalter, die beim Import automatisch ersetzt werden:</li>
    <ul>
      <li><code>{PL}</code> → Name des Projektleiters</li>
      <li><code>{heute}</code> → aktuelles Datum</li>
      <li><code>{nummer}</code> → fortlaufende Nummerierung</li>
    </ul>
  </ul>
</div>


            `, () => {
            const filename = document.getElementById("tpl-filename").value.trim() || "Vorlage";
            const tplName = document.getElementById("tpl-name").value.trim() || "Unbenannte Vorlage";
            const tplDesc = document.getElementById("tpl-desc").value.trim() || "";
            const keepResponsible = document.getElementById("tpl-keep-responsible").checked;
            const keepDuration = document.getElementById("tpl-keep-duration").checked;

            function serializeItem(item) {
                if (item.isDeleted) return null;

                return {
                type: item.type,
                data: {
                    report_id: item.data.report_id || "",
                    report_topic: item.data.report_topic || "",
                    report_desc: item.data.report_desc || "",
                    report_responsible: keepResponsible ? (item.data.report_responsible || "") : "",
                    report_status: item.data.report_status || "",
                    report_date: item.data.report_date || "",
                    report_deadline: item.data.report_deadline || "",
                    estimated_duration: keepDuration ? (item.data.estimated_duration || null) : null
                },
                children: (item.children || [])
                    .map(serializeItem)
                    .filter(Boolean) // gelöschte Kinder rausfiltern
                };
            }

            const template = {
            name: tplName,
            description: tplDesc,
            items: list.items.map(serializeItem).filter(Boolean) // auch auf oberster Ebene gelöschte Elemente weg
            };

            // JSON-Datei erzeugen und downloaden
            const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            const safeName = filename.replace(/[^a-z0-9_-]+/gi, "_");
            link.download = `${safeName}.json`;
            link.click();

            UIManager.showToast(`Vorlage "${tplName}" exportiert`, "success");
        });
    }

};