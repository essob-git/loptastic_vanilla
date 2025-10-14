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
import { ComparisonManager } from './ComparisonManager.js';
import { UIManager, PhaseHelper } from './uiManager.js';
import { SettingsManager } from './settingsManager.js';
import { Programm } from './programm.js';
import { ExportExcelManager } from './exportExcelManager.js';
import { HelperManager } from './helperManager.js';
import { GanttManager } from './ganttManager.js';
import { AuthManager } from './AuthManager.js';
// ----------- Applikations-Zustand -----------

/**
 * Globale Variable für den aktuellen Zustand: aktuelles Projekt und Liste.
 * @type {{currentProject: object|null, currentList: object|null}}
 */
const state = {
    currentProject: null,
    currentList: null
};


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
    document.getElementById('me-userdata').innerHTML = `
      <strong>Name:</strong> ${AuthManager.username()}<br>
      <strong>Abteilung:</strong> ${AuthManager.department() || '—'}
    `;

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


// ----------- StateManager -----------

/**
 * Globale State-Verwaltung für aktuelles Projekt und Liste.
 * Methoden zum Setzen, Abrufen und Aktualisieren von Projekten und Listen.
 */
export const StateManager = {
    /**
     * Gibt das aktuell geladene Projekt zurück.
     * @returns {object|null}
     */
    getCurrentProject() {
        return state.currentProject;
    },

    /**
     * Setzt das aktuelle Projekt und aktualisiert UI und Templates.
     * @param {object} project - Das neue Projektobjekt.
     */
    setCurrentProject(project) {
        state.currentProject = project;
        UIManager.updateProjectInfo(project);
        TemplateManager.loadProjectTemplates(project);
    },

    /**
     * Gibt die aktuell geladene Liste zurück.
     * @returns {object|null}
     */
    getCurrentList() {
        return state.currentList;
    },

    /**
     * Setzt die aktuelle Liste, aktualisiert UI und lädt Historie.
     * @param {object|null} list - Die neue Liste oder null.
     */
    setCurrentList(list) {
        if (!list) {
            state.currentList = null;
            UIManager.updateListContent(null);
            UIManager.updateSnapshotsForList(null);
            return;
        }
        state.currentList = list;
        UIManager.highlightSelectedList(list.meta.id);
        UIManager.updateListContent(list);
        HistoryManager.loadHistoryForList(list.meta.id);
    },

    /**
     * Gibt alle Listen des aktuellen Projekts zurück.
     * @returns {Array<object>}
     */
    getAllLists() {
        const project = StateManager.getCurrentProject();
        if (!project || !project.lists) return [];
        return project ? Object.values(project.lists) : [];
    },

    /**
     * Gibt alle Listen des Projekts zurück, nur gültige Objekte.
     * @returns {Array<object>}
     */
    getAllLists2() {
        const project = StateManager.getCurrentProject();
        if (!project || !project.lists) return [];
        return Object.values(project.lists).filter(list => list && typeof list === 'object');
    },

    /**
     * Gibt eine Liste anhand ihrer ID zurück.
     * @param {string} listId - Die ID der Liste.
     * @returns {object|undefined}
     */
    getListById(listId) {
        const project = StateManager.getCurrentProject();
        return project?.lists[listId];
    },

    /**
     * Gibt den aktuell eingeloggten Benutzer zurück.
     * @returns {object}
     */
    getCurrentUser() {
        return SettingsManager.getCurrentUser();
    },

    /**
     * Aktualisiert das aktuelle Projekt mit einer Updater-Funktion.
     * @param {function} updater - Funktion, die das Projekt verändert.
     * @returns {object} Das aktualisierte Projekt.
     */
    updateProject(updater) {
        const project = { ...state.currentProject };
        updater(project);
        state.currentProject = project;
        return project;
    },

    /**
     * Stellt sicher, dass ein Projekt alle notwendigen Strukturen besitzt.
     * @param {object} project
     * @returns {object} Das projekt mit garantierter Struktur.
     */
    ensureProjectStructure(project) {
        if (!project.lists) project.lists = {};
        if (!project.manifest.lists) project.manifest.lists = [];
        if (!project.finalizedLists) project.finalizedLists = [];
        if (!project.changelog) project.changelog = {};
        if (!project.snapshots) project.snapshots = {};
        return project;
    }
};


// ----------- Globale Hilfsfunktionen -----------

/**
 * Generiert eine eindeutige UUID.
 * @returns {string} Die generierte UUID.
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Formatiert ein Datum als deutsche Datums-/Zeitzeichenkette.
 * @param {string|Date} dateString - Ein Datum oder Datum-String.
 * @returns {string} Datums-/Zeitformat (deutsch).
 */
export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Erstellt eine tiefe Kopie eines Objekts.
 * @param {object} obj - Das zu klonende Objekt.
 * @returns {object} Tief kopiertes Objekt.
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Vergleicht zwei Objekte auf tiefgehende Gleichheit.
 * @param {object} a - Erstes Objekt.
 * @param {object} b - Zweites Objekt.
 * @returns {boolean} true wenn gleich, sonst false.
 */
export function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
