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

// ----------- Applikations-Zustand -----------
/**
 * Globale Variable für den aktuellen Zustand: aktuelles Projekt und Liste.
 * @type {{currentProject: object|null, currentList: object|null}}
 */
    const state = {
        currentProject: null,
        currentList: null
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


