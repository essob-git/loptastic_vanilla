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



/**
 * Hauptmodul der Anwendung.
 * Initialisiert UI, lädt Projekte, Listen und verwaltet den globalen Zustand.
 * Importiert alle Manager und bindet Events.
 */

import { ProjectManager } from './projectManager.js';
import { ListManager } from './listManager.js';
import { ItemManager } from './itemManager.js';
import { HistoryManager } from './historyManager.js';
//import { ExportManager } from './exportManager.js_displaced';
import { ExportManager2 } from './exportManager2.js';
import { TemplateManager } from './templateManager.js';
import { SnapshotManager2 } from './snapshotManager2.js';
import { ComparisonManager } from './comparisonManager.js';
import { UIManager, PhaseHelper } from './uiManager.js';
import { SettingsManager } from './settingsManager.js';
import { Programm } from './programm.js';
import { ExportExcelManager } from './exportExcelManager.js';
import { HelperManager } from './helperManager.js';
import { GanttManager } from './ganttManager.js';
import { AuthManager } from './AuthManager.js';
import { PlanModeManager } from './planModeManager.js';
import { StateManager } from './stateManager.js';



// ----------- Initialisierung -----------
document.addEventListener('DOMContentLoaded', async () => {
    // UI und Settings initialisieren
    await SettingsManager.init();
    await PhaseHelper.init();
    await   UIManager.init();

    // CollapseManager initialisieren, falls vorhanden
    if (window.CollapseManager) {
        window.CollapseManager.init({ rootSelector: '#items-container' });
    }

    // Browser-Reload abfangen, Hinweis anzeigen
    document.addEventListener("keydown", function (e) {
        if (
            (e.key === "F5") ||
            ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R"))
        ) {
            e.preventDefault();
            alert("Bitte nutze den Speichern-Button, um deine Änderungen zu sichern!");
        }
    });

    AuthManager.ensureLoggedIn()
        .then(info => {

            // Username
            const el = document.getElementById('me-username');
            if (el) el.textContent = AuthManager.username() || 'Unbekannt';

    // Name + Department im Block
            const userDataEl = document.getElementById('me-userdata');
            if (userDataEl) {
                userDataEl.replaceChildren(
                    Object.assign(document.createElement('strong'), { textContent: 'Name:' }),
                    document.createTextNode(` ${AuthManager.username() || 'Unbekannt'}`),
                    document.createElement('br'),
                    Object.assign(document.createElement('strong'), { textContent: 'Abteilung:' }),
                    document.createTextNode(` ${AuthManager.department() || '—'}`)
                );
            }
            if (AuthManager.isAdmin()) {
                    document.getElementById('admin-menu')?.classList.remove('d-none');
                }
        })
        .catch(err => {
            console.error("Auth Fehler:", err);
        });
    
     // Logout-Handler
    const logoutEl = document.getElementById('logout-link');
    if (logoutEl) {
        logoutEl.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/listify/api/auth/logout.php', { credentials: 'include' });
            } finally {
                location.href = '/listify/login.php';
            }
        });
    }
    

    // Versionsanzeige
    document.getElementById('version').innerHTML = `
        <h2>${Programm.getName()}</h2>
        <div id="versionsnumber">Version: ${Programm.getVersion()}</div>
        `;

    document.getElementById('credits').addEventListener('click', async () => {
        Programm.showLicenseModal();
    });

    document.getElementById('disclaimer').addEventListener('click', async () => {
        Programm.showDisclaimer();
    });

    // Projekt-Events
    document.getElementById('new-project').addEventListener('click', async () => {
        try {
            await ProjectManager.createNewProject();
        } catch (error) {
            console.error('Fehler beim Erstellen des Projekts:', error);
            UIManager.showToast('Fehler beim Projekt erstellen', 'error');
        }
    });

    document.getElementById('open-project').addEventListener('click', ProjectManager.openProject);
    document.getElementById('save-project').addEventListener('click', async () => {
        try {
            await ProjectManager.saveProject();
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            UIManager.showToast('Fehler beim Speichern: ' + error.message, 'error');
        }
    });

    // Dashboard und ItemList
    document.getElementById('showDashboard').addEventListener('click', UIManager.showDashboard);
    document.getElementById('showItems').addEventListener('click', UIManager.showItems);


    // Listen-Events
    document.getElementById('add-list').addEventListener('click', (e) => {
        HelperManager.showHelpTo("hilfe-lists-new");
        ListManager.showListModal();
    });

    document.getElementById('lists-container').addEventListener('click', (e) => {
        const listItem = e.target.closest('.list-item');
        if (listItem) {
            const listId = listItem.dataset.listId;
            const list = StateManager.getAllLists().find(l => l.meta && l.meta.id === listId);
            if (list) {
                StateManager.setCurrentList(list);
            }
        }
    });

    document.getElementById('overview-list').addEventListener('click', (e) => {
         
         HelperManager.showHelpTo("hilfe-lists-overview");
         ListManager.showListOverviewModal();
    });

    document.getElementById('finalize-list').addEventListener('click', ListManager.finalizeCurrentList);

    // Export/Bericht Events
   
    document.getElementById('export-file').addEventListener('click', ExportManager2.showExportModal);

    document.getElementById('export-xlsx').addEventListener('click', () => {
        ExportExcelManager.exportCurrentListToExcel();
    });

    // Template-Events
    document.getElementById('apply-template').addEventListener('click', () => {
        TemplateManager.applySelectedTemplate();
    });

    document.getElementById('compare-snapshots')?.addEventListener('click', () => {
        ComparisonManager.showComparisonModal();
    });

    document.getElementById('import-template').addEventListener('click', () => {
        document.getElementById('template-file-input').click();
    });

    document.getElementById('template-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        TemplateManager.loadExternalTemplate(file);
    });

    // NEU: Export der aktuellen Liste als Vorlage
    document.getElementById('export-template').addEventListener('click', () => {
        TemplateManager.exportTemplateFromCurrentList();
    });

    document.getElementById('take-snapshot').addEventListener('click', SnapshotManager2.showSnapshotModal);

    document.getElementById('save-user').addEventListener('click', SettingsManager.saveUserSettings);

    // Item-Events (Element-Erstellung)
    document.getElementById('add-h1').addEventListener('click', () => ItemManager.addItem('h1'));
    document.getElementById('add-h2').addEventListener('click', () => ItemManager.addItem('h2'));
    document.getElementById('add-h3').addEventListener('click', () => ItemManager.addItem('h3'));
    document.getElementById('add-p').addEventListener('click', () => ItemManager.addItem('p'));

    document.getElementById('restore-deleted-items')?.addEventListener('click', () => {
        ItemManager.restoreDeletedItems();
    });

    document.getElementById('purge-deleted-items')?.addEventListener('click', () => {
        const currentList = StateManager.getCurrentList();
        if (!currentList) return;

        const deletedCount = ItemManager.countSoftDeletedItems(currentList.items || []);
        if (deletedCount === 0) {
            UIManager.showToast('Keine gelöschten Elemente vorhanden', 'info');
            return;
        }

        if (confirm(`${deletedCount} gelöschte Elemente endgültig löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.`)) {
            ItemManager.hardDeleteAllSoftDeletedItems();
        }
    });


    document.getElementById('showGantt').addEventListener('click', () => GanttManager.showGantt());

    const switchEl = document.getElementById("helpModeSwitch");
    if (switchEl) {
        // Switch auf OFF zurücksetzen oder gespeicherten Zustand laden
        switchEl.checked = false; // Immer auf AUS starten
        HelperManager.setMode(false);

        // Event-Handler
        switchEl.addEventListener("change", (e) => {
        HelperManager.setMode(e.target.checked);
        });
    }

 
const switchEl2 = document.getElementById('planModeSwitch');

if (switchEl2) {
    switchEl2.addEventListener('change', (e) => {
      if (e.target.checked) {
        PlanModeManager.enable();
      } else {
        // disable startet einen Dialog
        PlanModeManager.disable();

        // Wenn das Modal einfach geschlossen wird (X oder ESC),
        // bleibt der Planmodus aktiv → Switch wieder aktivieren
        const modalEl = document.getElementById('mainModal');

        if (modalEl) {
          modalEl.addEventListener('hidden.bs.modal', () => {
            if (StateManager.isPlanModeActive()) {
              // Nutzer hat abgebrochen
              switchEl2.checked = true;
            }
          }, { once: true });
        }
      }
    });
    }




    // Drag & Drop Initialisierung
    UIManager.setupDragDropContainers();

    // Laden der Vorlagen
    TemplateManager.loadTemplates();

    // Collapse/Expand-Icons
    document.addEventListener('click', (e) => {
        const icon = e.target.closest('.collapse-all-icon');
        if (!icon) return;

        const isCollapsed = icon.classList.toggle('active');
        if (isCollapsed) {
            CollapseManager?.collapseAll();
        } else {
            CollapseManager?.expandAll();
        }
    });
});
