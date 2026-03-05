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
import { UIManager } from './uiManager.js';
import { AuthManager } from './AuthManager.js';
import { DebugLogger, setDebuggingMode } from './debugLogger.js';


async function loadDefaultConfig() {
    try {
        const response = await fetch('app/default_config.json');
        return await response.json();
    } catch (e) {
DebugLogger.error('Konnte default_config.json nicht laden:', e);
        return {};
    }
}

function getNested(obj, path) {
    return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}

export const SettingsManager = {
    defaultConfig: {},
    async init() {
        this.defaultConfig = await loadDefaultConfig();
        this.refreshDebuggingMode();
        DebugLogger.log("DefaultConfig geladen:", this.defaultConfig); // 🔍 Debug
        this.loadUserSettings();
    },

    isDebuggingEnabled() {
        const project = StateManager.getCurrentProject();
        const value = project?.settings?.debuggingMode ?? this.defaultConfig?.debuggingMode ?? false;
        return value === true || value === 'true';
    },

    refreshDebuggingMode() {
        setDebuggingMode(this.isDebuggingEnabled());
    },
    async getSetting(key) {
        const project = StateManager.getCurrentProject();
        // Erst im Projekt suchen
        let value = getNested(project?.settings || {}, key);
        // Falls nicht gefunden, in den Defaults
        if (value === undefined) {
            value = getNested(this.defaultConfig, key);
        }
        return value;
    },


// 🟢 NEU: explizit für Objekt-Einstellungen wie lists_phase
async getConfigObject(key) {
    const project = StateManager.getCurrentProject();
    if (project?.settings?.[key] && typeof project.settings[key] === "object") {
        return project.settings[key];
    }

    if (this.defaultConfig?.[key] && typeof this.defaultConfig[key] === "object") {
        return this.defaultConfig[key];
    }

    return {}; // fallback
},


    async setSetting(key, value) {
        StateManager.updateProject(project => {
            if (!project.settings) project.settings = {};
            project.settings[key] = value;
            return project;
        });
        if (key === 'debuggingMode') {
            this.refreshDebuggingMode();
        }
        UIManager.showToast(`Einstellung "${key}" gespeichert`, 'success');
    },

    loadUserSettings() {
        const project = StateManager.getCurrentProject();
        const userNameInput = document.getElementById('user-name');AuthManager.username() || project?.settings?.userName;
        
        if (project?.settings?.userName) {
            userNameInput.value = project.settings.userName;
        } else {
            userNameInput.value = '';
        }
    },
    
    saveUserSettings() {
        const userName = document.getElementById('user-name').value;
        StateManager.updateProject(project => {
            if (!project.settings) project.settings = {};
            project.settings.userName = userName;
            return project;
        });
        
        UIManager.showToast('Benutzereinstellungen gespeichert', 'success');
        return userName;
    },
    
    getCurrentUser() {
        const project = StateManager.getCurrentProject();
        return project?.settings?.userName || 'Unbekannter Benutzer';
    },


   async ensureUserName() {
        const project = StateManager.getCurrentProject();
        let name = AuthManager.username() || project?.settings?.userName; //project?.settings?.userName;

        if (!name || name.trim().toLowerCase() === "unbekannter benutzer") {
            return new Promise((resolve) => {
                UIManager.showModal("Wer sind Sie?", `
                    <div class="mb-3">
                        <div class="alert alert-warning" role="alert">
                        <p>Derzeit wurde in Listify kein Anwender / Rolle benannt, daher muss für die gewünschte Aktion ein Namen eingeben werden.
                        <ul>
                            <li>Wenn Sie die Aktion z.B. im Namen des SGL / AL etc. druchführen, könnte jetzt der Name der Person eingeben werden.</li>
                            <li>Wenn Sie die Aktion als Projektleitung / -ingenieur durchführen, sollte dieser Name eigeben werden.
                        </ul></p>
                        <p><strong>Muster: </strong>Vorname Nachname oder Funktion 
                        </div>
                        <label class="form-label">Bitte geben Sie Ihren Namen ein</label>
                        <input type="text" class="form-control" id="user-name-input" required>
                    </div>
                `, () => {
                    const input = document.getElementById('user-name-input');
                    const newName = input.value.trim();
                    if (!newName) {
                        input.classList.add('is-invalid');
                        return false; // Modal bleibt offen
                    }

                    StateManager.updateProject(project => {
                        project.settings = project.settings || {};
                        project.settings.userName = newName;
                        return project;
                    });

                    // Optional: ins UI-Feld schreiben
                    const uiInput = document.getElementById('user-name');
                    if (uiInput) uiInput.value = newName;

                    if (typeof this.saveUserSettings === "function") {
                        this.saveUserSettings();
                    }

                    UIManager.showToast(`Willkommen, ${newName}`, 'success');
                    resolve(newName);
                });
            });
        }

        return name;
    }

};