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
import { calcAutoDeadline, calcEarliestStart } from './itemManager.js';
import { UIManager } from './uiManager.js';
import { HolidayManager } from './holidayManager.js';
import { DebugLogger } from './debugLogger.js';

export const GanttManager = {
  showGantt() {
    const list = StateManager.getCurrentList();
    if (!list) {
      UIManager.showToast("Keine Liste geladen", "error");
      return;
    }

    function flatten(items) {
      return items.reduce((acc, it) => {
        acc.push(it);
        if (it.children?.length) acc.push(...flatten(it.children));
        return acc;
      }, []);
    }
    const allItems = flatten(list.items);

    // 1. Tasks vorbereiten
    let tasks = allItems
      .filter(it => it.type === 'p' && !it.isDeleted)
      .map(it => {
        const start = calcEarliestStart(it, allItems);
        const end = it.data.report_deadline || calcAutoDeadline(it, allItems);

        // ⏭️ überspringen, wenn kein Start oder kein End berechnet werden kann
        if (!start || !end) return null;

        const deps = (it.data.dependencies || []).map(d => d.id).join(',');

        return {
          id: it.id,
          name: it.data.report_topic || "(kein Titel)", // 👉 nur Topic als Name
          start: toISO(start),
          end: toISO(end),
          progress: it.data.report_status === 'Erledigt' ? 100 : 0,
          dependencies: deps,
          _meta: { // zusätzliche Infos für Popup
            id: it.data.report_id,
            responsible: it.data.report_responsible,
            duration: it.data.estimated_duration,
            status: it.data.report_status,
            deadline: it.data.report_deadline
          }
        };
      })
      .filter(Boolean);

    // 2. Dependencies säubern
    const validIds = new Set(tasks.map(t => t.id));
    tasks = tasks.map(t => ({
      ...t,
      dependencies: t.dependencies
        .split(',')
        .filter(id => validIds.has(id))
        .join(',')
    }));

    // 3. Modal anzeigen
    UIManager.showModal(
      `Gantt-Diagramm: ${list.meta.name}`,
  `
      <div class="alert alert-warning" role="alert">
      <strong>Test: </strong> Hier wird versucht, die Liste in ein Gantt-Diagramm zu überführen. Es werden nur Vorgänge mit einer Deadline und einer Dauer visualisiert.<br>
      Was wird dargestellt: 
      <ul><li>Start-Datum = Deadline - Dauer</li><li>End-Datum = Deadline</li></ul>
      </div>
      <div class="w-100 overflow-x-auto">
        <div id="gantt-container" style="height:70vh; "></div>
      </div>

  `,
  null,
  'xl',
      async () => {

         const year = new Date().getFullYear();
  const holidays = await HolidayManager.getAllMarkedDays(year);
DebugLogger.log("Holidays an Frappe Gantt:", holidays);

        const container = document.getElementById("gantt-container");
        container.innerHTML = "";

const gantt = new Gantt("#gantt-container", tasks, {
  column_width: 30,
  bar_height: 30,
  
  upper_header_height: 45,
  lower_header_height: 40,
  view_mode: 'Week',
  view_mode_select: true,
  today_button: true,
  date_format: 'DD.MM.YYYY',
  readonly: true,
  holidays,
  custom_popup_html: task => {
    const m = task._meta || {};
    return `
      <div class="p-2 small">
        <strong>${task.name}</strong><br>
        <table class="table table-sm mb-0">
          <tr><th>ID</th><td>${m.id || "-"}</td></tr>
          <tr><th>Verantwortlich</th><td>${m.responsible || "-"}</td></tr>
          <tr><th>Dauer</th><td>${m.duration ? m.duration.value + " " + m.duration.unit : "-"}</td></tr>
          <tr><th>Start</th><td>${task.start}</td></tr>
          <tr><th>Ende</th><td>${task.end}</td></tr>
          <tr><th>Deadline</th><td>${m.deadline || "-"}</td></tr>
          <tr><th>Status</th><td>${m.status || "-"}</td></tr>
        </table>
      </div>
    `;
  }
});

// ⏩ Neu: nach dem Rendern Breite anpassen
setTimeout(() => {
  const modalBody = container.closest(".modal-body");
  if (modalBody) {
    container.style.width = modalBody.clientWidth + "px";
  }
  // gantt ist hier im Scope verfügbar ✅
  gantt.change_view_mode("Week");
}, 100);
      }
    );
  }
};

// Hilfsfunktion
function toISO(dateStr) {
  if (!dateStr) return null;
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dateStr);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return dateStr;
}
