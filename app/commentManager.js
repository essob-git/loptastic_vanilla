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

import { StateManager, generateUUID } from './app.js';
import { UIManager } from './uiManager.js';
import { ItemManager } from './itemManager.js';
import { SettingsManager } from './settingsManager.js';

export const CommentManager = {
async showCommentModal(itemId) {
    const list = StateManager.getCurrentList();
    if (!list) return;
    const item = ItemManager.findItemById(list.items, itemId);
    if (!item) return;

    if (!item.comments) item.comments = [];

    // ⬇️ Erst User sicherstellen, bevor das Kommentar-Modal aufgeht
    await SettingsManager.ensureUserName();

    const limit = await SettingsManager.getSetting("commentLimit") ?? 0;
    const categories = await SettingsManager.getSetting("commentCategories") ?? ["Allgemein"];

    const commentsHtml = item.comments.map(c => `
      <div class="border rounded p-2 mb-2">
        <div><strong>${c.author}</strong> (${c.category})</div>
        <div class="text-muted small">${new Date(c.date).toLocaleString()}</div>
        <div>${c.text}</div>
      </div>
    `).join('') || "<p class='text-muted'>Keine Kommentare vorhanden</p>";

    UIManager.showModal(
      `Kommentare zu ${item.data.report_topic || "Item"}`,
      `
      <div id="comments-list">${commentsHtml}</div>
      <hr>
      <div class="mb-3">
        <label class="form-label">Kategorie</label>
        <select id="comment-category" class="form-select">
          ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Kommentar</label>
        <textarea id="comment-text" class="form-control" rows="3"
          ${limit > 0 ? `maxlength="${limit}"` : ""}></textarea>
        ${limit > 0 ? `<small id="comment-counter" class="text-muted">Noch ${limit} Zeichen</small>` : ""}
      </div>
      `,
      () => {
        const text = document.getElementById("comment-text").value.trim();
        if (!text) {
          UIManager.showToast("Kommentar darf nicht leer sein", "error");
          return false;
        }

        const author = StateManager.getCurrentProject()?.settings?.userName || "Unbekannter Benutzer";
        const category = document.getElementById("comment-category").value;

        this.addComment(itemId, { author, category, text });
        this.showCommentModal(itemId); // neu aufbauen
      }
    );

    if (limit > 0) {
      const textarea = document.getElementById("comment-text");
      const counter = document.getElementById("comment-counter");
      textarea.addEventListener("input", () => {
        const remaining = limit - textarea.value.length;
        counter.textContent = `Noch ${remaining} Zeichen`;
      });
    }
},


  addComment(itemId, { author, category, text }) {
    const list = StateManager.getCurrentList();
    if (!list) return;
    const item = ItemManager.findItemById(list.items, itemId);
    if (!item) return;

    if (!item.comments) item.comments = [];

    const comment = {
      id: generateUUID(),
      date: new Date().toISOString(),
      author,
      category,
      text: this.limitText(text)
    };

    item.comments.push(comment);
    list.meta.lastModified = new Date().toISOString();
    UIManager.showToast("Kommentar hinzugefügt", "success");
    return comment;
  },

  limitText(text) {
    const limit = SettingsManager.getSetting("commentLimit") ?? 0;
    if (limit > 0 && text.length > limit) {
      return text.substring(0, limit);
    }
    return text;
  }
};

