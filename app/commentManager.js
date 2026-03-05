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
import { generateUUID } from './utils.js'
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

    const advancedMode = StateManager.isAdvancedModeActive();
    const commentsHtml = item.comments
      .filter(c => advancedMode || !c.isDeleted)
      .map(c => `
      <div class="border rounded p-2 mb-2 ${c.isDeleted ? 'bg-light text-muted border-danger-subtle' : ''}">
        <div class="d-flex justify-content-between">
          <div><strong>${c.author}</strong> (${c.category})</div>
          <div class="btn-group btn-group-sm">
            ${!c.isDeleted ? `<button class="btn btn-outline-danger comment-delete" data-comment-id="${c.id}">Löschen</button>` : ''}
            ${advancedMode && c.isDeleted ? `<button class="btn btn-outline-success comment-restore" data-comment-id="${c.id}">Wiederherstellen</button><button class="btn btn-outline-danger comment-delete-permanent" data-comment-id="${c.id}">Endgültig löschen</button>` : ''}
          </div>
        </div>
        <div class="text-muted small">${new Date(c.date).toLocaleString()}${c.isDeleted ? ' · gelöscht' : ''}</div>
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

    document.querySelectorAll('.comment-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const commentId = btn.dataset.commentId;
        this.softDeleteComment(itemId, commentId);
        this.showCommentModal(itemId);
      });
    });

    document.querySelectorAll('.comment-restore').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const commentId = btn.dataset.commentId;
        this.restoreComment(itemId, commentId);
        this.showCommentModal(itemId);
      });
    });

    document.querySelectorAll('.comment-delete-permanent').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const commentId = btn.dataset.commentId;
        this.deleteCommentPermanently(itemId, commentId);
        this.showCommentModal(itemId);
      });
    });

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

  softDeleteComment(itemId, commentId) {
    const list = StateManager.getCurrentList();
    if (!list) return;
    const item = ItemManager.findItemById(list.items, itemId);
    if (!item || !Array.isArray(item.comments)) return;

    const comment = item.comments.find(c => c.id === commentId);
    if (!comment) return;
    comment.isDeleted = true;
    comment.deletedAt = new Date().toISOString();
    list.meta.lastModified = new Date().toISOString();
  },

  restoreComment(itemId, commentId) {
    const list = StateManager.getCurrentList();
    if (!list) return;
    const item = ItemManager.findItemById(list.items, itemId);
    if (!item || !Array.isArray(item.comments)) return;

    const comment = item.comments.find(c => c.id === commentId);
    if (!comment) return;
    comment.isDeleted = false;
    delete comment.deletedAt;
    list.meta.lastModified = new Date().toISOString();
  },

  deleteCommentPermanently(itemId, commentId) {
    const list = StateManager.getCurrentList();
    if (!list) return;
    const item = ItemManager.findItemById(list.items, itemId);
    if (!item || !Array.isArray(item.comments)) return;

    item.comments = item.comments.filter(c => c.id !== commentId);
    list.meta.lastModified = new Date().toISOString();
  },

  limitText(text) {
    const limit = SettingsManager.getSetting("commentLimit") ?? 0;
    if (limit > 0 && text.length > limit) {
      return text.substring(0, limit);
    }
    return text;
  }
};

