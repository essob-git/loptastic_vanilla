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
import { HelperManager } from './helperManager.js';

// Baut nur den HTML-Code und gibt ihn zurück
export function renderDashboard() {

     HelperManager.showHelpTo('hilfe-dashboard');
    const project = StateManager.getCurrentProject();
    if (!project) {
        return '<div class="alert alert-warning">Kein Projekt geladen</div>';
    }

   
    // Items einsammeln
    const allItems = [];
    Object.values(project.lists).forEach(list => {
        function traverse(items) {
            items.forEach(it => {
                if (!it.isDeleted && it.type === 'p') {
                    allItems.push({ ...it, listName: list.meta.name });
                }
                if (it.children?.length) traverse(it.children);
            });
        }
        traverse(list.items || []);
    });

    // Deadlines prüfen
    const parseDate = str => {
        const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(str);
        if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str);
        return null;
    };

    const now = new Date();
    const in4w = new Date();
    in4w.setDate(now.getDate() + 28);

    const overdue = [];
    const upcoming = [];
    const noDeadline = [];

    const relevantStatus = ['ausstehend', 'in Bearbeitung'];

    allItems.forEach(item => {
        const status = item.data.report_status;
        if (!relevantStatus.includes(status)) return;

        const rawDeadline = item.data.report_deadline?.trim();
        if (!rawDeadline) {
            noDeadline.push({ ...item, deadlineInfo: 'Keine Angabe' });
            return;
        }

        const dt = parseDate(rawDeadline);
        if (!dt) {
            noDeadline.push({ ...item, deadlineInfo: `Ungültig: ${rawDeadline}` });
            return;
        }

        if (dt < now) {
            overdue.push(item);
        } else if (dt <= in4w) {
            upcoming.push(item);
        }
    });

    // Tabellen rendern
    const renderTable = (title, rows, colExtra = false) => `
        <h5 class="mt-1 fw-bold">${title}</h5>
        <table class="table table-striped-columns">
            <thead>
                <tr>
                    <th scope="col"width="160px">Liste</th>
                    <th scope="col"width="80px">ID</th>
                    <th scope="col" width="*">Thema</th>
                    <th scope="col" width="160px">Verantwortlich</th>
                    <th scope="col" width="160px">Deadline</th>
                    <th scope="col" width="160px">Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(it => `
                    <tr>
                        <td>${it.listName}</td>
                        <td>${it.data.report_id}</td>
                        <td>${it.data.report_topic}</td>
                        <td>${it.data.report_responsible}</td>
                        <td>${colExtra ? it.deadlineInfo : it.data.report_deadline}</td>
                        <td>${it.data.report_status}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;


    return `
        <h3 class="mb-4">Projekt-Dashboard</h3>
        <p>Hier wird eine Zusammenfassung der Aufgaben mit dem Status (in Bearbeitung oder ausstehend) erzeugt.</p>
        <div id="todo-overdue" class="border bg-danger-subtle border-2 m-1 p-2 mb-4">
            ${renderTable('Überfällige Aufgaben', overdue)}
        </div>
        <div id="todo-next-weeks" class="border bg-warning-subtle border-2 m-1 p-2 mb-4"> 
            ${renderTable('Fällig in den nächsten 4 Wochen', upcoming)}
        </div>
        <div id="todo-withoutDate" class="border bg-light border-2 m-1 p-2 mb-4">
        ${renderTable('Offene Aufgaben ohne gültige Deadline', noDeadline, true)}
        </div>
    `;
}
