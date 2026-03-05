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
import { deepClone, deepEqual, deepCloneSafe} from './utils.js';
import { HistoryManager } from './historyManager.js';
import { DebugLogger } from './debugLogger.js';

async function commitPlanDifferences() {

function flattenItems(items) {
  const result = [];
  (function recurse(arr) {
    for (const item of arr) {
      result.push(item);
      if (item.children && item.children.length > 0) recurse(item.children);
    }
  })(items);
  return result;
}

  DebugLogger.log("🔍 commitPlanDifferences gestartet");

  try {
    const beforeProject = StateManager.getPlanModeBackup();
    const afterProject  = StateManager.getCurrentProject();
    const afterList     = StateManager.getCurrentList();

    if (!beforeProject || !afterProject || !afterList) {
      UIManager.showToast("Kein Vergleich möglich – fehlende Daten.", "error");
      return;
    }

    const listId = afterList.meta?.id;
    const beforeList = beforeProject.lists?.[listId];
    if (!beforeList) {
      UIManager.showToast("Kein Backup zur aktuellen Liste gefunden.", "error");
      return;
    }

    DebugLogger.log("📋 Vergleiche Liste:", listId, beforeList?.items?.length, "→", afterList?.items?.length);

    let totalChanges = 0;
    const changeBuffer = [];

const beforeItems = flattenItems(beforeList.items || []);
const afterItems  = flattenItems(afterList.items || []);
DebugLogger.log("📋 beforeItems:", beforeItems.length, "afterItems:", afterItems.length);
DebugLogger.log("🔍 Beispiel beforeItem:", beforeItems[0]);
DebugLogger.log("🔍 Beispiel afterItem:", afterItems[0]);

    const beforeById = Object.fromEntries(beforeItems.map(i => [i.id, i]));
    const afterById  = Object.fromEntries(afterItems.map(i => [i.id, i]));

    for (const afterItem of afterItems) {
      const beforeItem = beforeById[afterItem.id];

      if (!beforeItem) {
        changeBuffer.push({
          itemId: afterItem.id,
          action: "CREATE",
          changes: { item: afterItem }
        });
        continue;
      }

      const diff = {};
      const beforeData = beforeItem.data || {};
      const afterData = afterItem.data || {};
      const allDataKeys = new Set([
        ...Object.keys(beforeData),
        ...Object.keys(afterData)
      ]);

      for (const key of allDataKeys) {
        if (!deepEqual(beforeItem.data?.[key], afterItem.data?.[key])) {
          diff[key] = [beforeItem.data?.[key], afterItem.data?.[key]];
        }
      }

      // Strukturänderungen außerhalb von data erfassen
      if (!deepEqual(beforeItem.parentId, afterItem.parentId)) {
        diff.parentId = [beforeItem.parentId ?? null, afterItem.parentId ?? null];
      }
      if (!deepEqual(beforeItem.sort, afterItem.sort)) {
        diff.sort = [beforeItem.sort ?? null, afterItem.sort ?? null];
      }
      if (!deepEqual(beforeItem.type, afterItem.type)) {
        diff.type = [beforeItem.type ?? null, afterItem.type ?? null];
      }

      if (Object.keys(diff).length > 0) {
        changeBuffer.push({
          itemId: afterItem.id,
          action: "UPDATE",
          changes: diff
        });
      }
    }

    // Prüfe gelöschte Items
    for (const beforeItem of beforeItems) {
      if (!afterById[beforeItem.id]) {
        changeBuffer.push({
          itemId: beforeItem.id,
          action: "DELETE",
          changes: {}
        });
      }
    }

    DebugLogger.log("🧩 erkannte Änderungen:", changeBuffer.length);
    if (changeBuffer.length === 0) {
      UIManager.showToast("Keine Änderungen erkannt.", "info");
      return;
    }

    // 🔍 Grund abfragen (optional)
    const specialChanges = changeBuffer.filter(c => {
      if (c.action === "CREATE") {
        const createdItem = c.changes?.item;
        return ["report_deadline", "estimated_duration"].some(key =>
          createdItem?.data?.[key] != null
        );
      }

      return Object.keys(c.changes || {}).some(k =>
        ["report_deadline", "estimated_duration"].includes(k)
      );
    });

    let globalReason = null;
    if (specialChanges.length > 0) {
      globalReason = await UIManager.promptReason?.("Es wurden Fristen oder Dauern geändert. Bitte geben Sie einen Grund an:");
    } else {
      globalReason = await UIManager.promptReason?.("Optional: Bitte geben Sie einen Grund für die Änderungen an:");
    }

    // 🔄 Loggen
    for (const entry of changeBuffer) {
      await HistoryManager.forceLogChange(entry.itemId, entry.action, {
        ...entry.changes,
        ...(globalReason ? { reason: globalReason } : {})
      });
      totalChanges++;
    }

    UIManager.showToast(`${totalChanges} Änderungen übernommen.`, "success");
  } catch (err) {
    DebugLogger.error("❌ Fehler in commitPlanDifferences:", err);
  } finally {
    StateManager.setPlanModeActive(false);
    const currentList = StateManager.getCurrentList();
    if (currentList) HistoryManager.loadHistoryForList(currentList.meta.id);
  }
}


// ----------------------------------------------------
//  PlanModeManager
// ----------------------------------------------------
export const PlanModeManager = {
  enable() {
    if (StateManager.isPlanModeActive()) {
      UIManager.showToast('Planspielmodus ist bereits aktiv', 'info');
      return;
    }

    const project = StateManager.getCurrentProject();
    if (!project) {
      UIManager.showToast('Kein Projekt geladen', 'warning');
      return;
    }

    // Backup speichern
    StateManager.setPlanModeBackup(deepCloneSafe(project));
   // 🧩 aktuelle Liste merken, damit Restore weiß, was geladen war
    const currentList = StateManager.getCurrentList();
    if (currentList?.meta?.id) {
      StateManager.setPlanBackupCurrentListId(currentList.meta.id);
    } else {
      StateManager.setPlanBackupCurrentListId(null);
    } 

    StateManager.setPlanModeActive(true);
    UIManager.showToast('Planspielmodus aktiviert – Änderungen werden nicht protokolliert.', 'warning');
    document.body.classList.add('planmode');
  },

disable() {
  if (!StateManager.isPlanModeActive()) {
    UIManager.showToast("Planspielmodus ist nicht aktiv", "info");
    return;
  }

  const bodyHtml = `
    <p>Sie beenden den Planspiel
modus.</p>
    <p>Wie möchten Sie fortfahren?</p>

    <div class="form-check">
      <input class="form-check-input" type="radio" name="planChoice" id="planChoiceAccept" value="accept" checked>
      <label class="form-check-label" for="planChoiceAccept">
        Änderungen <strong>übernehmen</strong>
      </label>
    </div>
    <div class="form-check mt-2">
      <input class="form-check-input" type="radio" name="planChoice" id="planChoiceDiscard" value="discard">
      <label class="form-check-label" for="planChoiceDiscard">
        Änderungen <strong>verwerfen</strong> und Originalzustand wiederherstellen
      </label>
    </div>
  `;

 UIManager.showModal("Planspielmodus beenden", bodyHtml, async () => {
    const choice = document.querySelector('input[name="planChoice"]:checked')?.value;

    try {
      if (choice === "discard") {
        StateManager.restorePlanModeBackup();
        UIManager.showToast("Änderungen verworfen – Originalzustand wiederhergestellt.", "info");
      } else {
        // 🧠 Commit läuft und braucht das Backup!
        await commitPlanDifferences();
        UIManager.showToast("Änderungen übernommen.", "success");
      }

      // ✅ Backup erst nach dem Commit/Restore löschen
      StateManager.clearPlanModeBackup();

    } catch (err) {
      DebugLogger.error("Fehler beim Beenden des Planspiels:", err);
      UIManager.showToast("Fehler beim Beenden des Planspiels", "error");
    } finally {
      // 🧩 Planspiel sauber beenden
      StateManager.setPlanModeActive(false);
      document.body.classList.remove("planmode");

      document.getElementById("save-project")?.removeAttribute("disabled");
      document.getElementById("take-snapshot")?.removeAttribute("disabled");

      const sw = document.getElementById("planModeSwitch");
      if (sw) sw.checked = false;

      DebugLogger.info("Planspielmodus vollständig beendet.");
    }
  });
}
,

};
