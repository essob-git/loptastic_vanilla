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

import { HistoryManager } from './historyManager.js';
import { TemplateManager } from './templateManager.js';
import { UIManager } from './uiManager.js';
import { SettingsManager } from './settingsManager.js';


// ----------- Applikations-Zustand -----------
/**
 * Globale Variable für den aktuellen Zustand: aktuelles Projekt und Liste.
 * @type {{currentProject: object|null, currentList: object|null}}
 */
    const state = {
        currentProject: null,
        currentList: null,
        advancedModeActive: false,

        // Planspiel
        planModeActive: false,
        planBackup: null,
        planBackupCurrentListId: null,
    };


    

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

    isAdvancedModeActive() {
        return !!state.advancedModeActive;
    },

    setAdvancedModeActive(active) {
        state.advancedModeActive = !!active;
    },

    // --- Planmodus-Handling ---
    isPlanModeActive() {
        return !!state.planModeActive;
    },

    setPlanModeActive(active) {
        state.planModeActive = active;
    },

    setPlanModeBackup(backup) {
        state.planBackup = backup;
    },

    clearPlanModeBackup() {
        state.planBackup = null;
    },
    setPlanBackupCurrentListId(id) {
  state.planBackupCurrentListId = id;
},

restorePlanModeBackup() {
  if (!state.planBackup) {
    console.warn("Kein PlanBackup zum Wiederherstellen vorhanden");
    return;
  }
console.log("Restore backup:", {
  hasBackup: !!state.planBackup,
  listId: state.planBackupCurrentListId,
  availableLists: Object.keys(state.planBackup?.lists || {})
});

  const backup = state.planBackup;
  const restoredProject = JSON.parse(JSON.stringify(backup));
  const oldListId = state.planBackupCurrentListId;

  // Reset Planspiel-Flags
  state.planModeActive = false;
  state.planBackup = null;
  state.planBackupCurrentListId = null;

  // 1️⃣ Projekt neu setzen (dies ruft bereits updateProjectInfo etc.)
  this.setCurrentProject(restoredProject);

  // 2️⃣ Die passende Liste aus dem wiederhergestellten Projekt neu selektieren
  let restoredList = null;
  if (oldListId && restoredProject.lists && restoredProject.lists[oldListId]) {
    restoredList = restoredProject.lists[oldListId];
    this.setCurrentList(restoredList);
  } else {
    // keine passende Liste mehr vorhanden → Ansicht leeren
    this.setCurrentList(null);
  }

  // 3️⃣ UI vollständig neu aufbauen
  try {
    // Liste anzeigen
    if (restoredList) {
      UIManager.updateListContent(restoredList);
      UIManager.highlightSelectedList(restoredList.meta.id);
      UIManager.updateSnapshotsForList(restoredList);
    } else {
      UIManager.updateListContent(null);
    }

    // Sicherheitshalber: DOM neu aufbauen
    setTimeout(() => {
      if (typeof UIManager.refreshListContent === "function") {
        UIManager.refreshListContent();
      }
    }, 50);
  } catch (err) {
    console.error("Fehler beim UI-Refresh nach Restore:", err);
  }

  console.info("Planspiel: Backup erfolgreich wiederhergestellt");
},

_getInternalState() {
  return state;
},

  getPlanModeBackup() {
    return state.planBackup;
    },

    /**
     * Aktualisiert das aktuelle Projekt mit einer Updater-Funktion.
     * @param {function} updater - Funktion, die das Projekt verändert.
     * @returns {object} Das aktualisierte Projekt.
     */
    updateProject(updater) {

          // Schreibsperre im Planspielmodus
        if (this.isPlanModeActive()) {
            console.warn("⏸ updateProject(): Planspielmodus aktiv – Änderungen werden nur temporär gehalten.");
        }

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

