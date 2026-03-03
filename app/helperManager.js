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

import { HelperContent } from './helperContent.js';
import {
  findTopicById,
  getCategoryEntries,
  groupEntriesByCategory,
  normalizeTopicId
} from './helpUtils.js';

/**
 * Zentraler Manager für das Hilfesystem.
 *
 * Funktionen:
 * - Verwaltung des Hilfe-Modus (Switch)
 * - Rendern der Hilfe-Sidebar inkl. Navigation
 * - Kontextbezogene Hilfe über Topic-ID
 * - Event-Delegation für `data-help-topic`
 */
export const HelperManager = {
  /** @type {boolean} true = Hilfe-Modus aktiv */
  mode: false,

  /** @type {boolean} verhindert mehrfaches Binden globaler Events */
  contextHelpBound: false,

  /**
   * Synchronisiert den Hilfe-Modus mit UI und Sidebar-Zustand.
   * @param {boolean} force
   */
  setMode(force) {
    this.mode = !!force;

    const switchEl = document.getElementById('helpModeSwitch');
    if (switchEl) switchEl.checked = this.mode;

    document.body.classList.toggle('help-mode', this.mode);

    if (this.mode) {
      this.openSidebar();
      return;
    }

    const sidebarEl = document.getElementById('helpSidebar');
    if (!sidebarEl) return;

    const instance = bootstrap.Offcanvas.getInstance(sidebarEl);
    instance?.hide();
  },

  /**
   * Schaltet den Modus um.
   * @param {boolean|null} force
   */
  toggleMode(force = null) {
    this.setMode(force === null ? !this.mode : force);
  },

  /**
   * Initialisiert die globale Kontext-Hilfe.
   * Klick auf Elemente mit `data-help-topic` öffnet die passende Hilfe.
   */
  initContextHelp() {
    if (this.contextHelpBound) return;

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-help-topic]');
      if (!trigger) return;

      const topicId = trigger.getAttribute('data-help-topic');
      if (!topicId) return;

      event.preventDefault();
      this.setMode(true);
      this.showHelpTo(topicId, { forceOpen: true });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'F1') return;
      event.preventDefault();
      this.setMode(true);
    });

    this.contextHelpBound = true;
  },

  /**
   * Baut die Sidebar bei Bedarf und öffnet sie.
   * @param {string|null} topicId
   */
  openSidebar(topicId = null) {
    const sidebarEl = this.ensureSidebar();
    const sidebar = bootstrap.Offcanvas.getOrCreateInstance(sidebarEl, { backdrop: false, scroll: true });

    this.renderContent(topicId);
    sidebar.show();
  },

  /**
   * Erstellt das Offcanvas-Element einmalig.
   * @returns {HTMLElement}
   */
  ensureSidebar() {
    let sidebarEl = document.getElementById('helpSidebar');
    if (sidebarEl) return sidebarEl;

    sidebarEl = document.createElement('div');
    sidebarEl.id = 'helpSidebar';
    sidebarEl.className = 'offcanvas offcanvas-end';
    sidebarEl.tabIndex = -1;
    sidebarEl.style.width = '399px';
    sidebarEl.innerHTML = `
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">Listify Hilfe</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Schließen"></button>
      </div>
      <div class="offcanvas-body overflow-auto">
        <div id="helpContent"></div>
      </div>
    `;

    sidebarEl.addEventListener('hidden.bs.offcanvas', () => {
      if (this.mode) this.setMode(false);
    });

    document.body.appendChild(sidebarEl);
    return sidebarEl;
  },

  /**
   * Rendert Hilfenavigation + Inhalte.
   * @param {string|null} topicId
   */
  renderContent(topicId = null) {
    const container = document.getElementById('helpContent');
    if (!container) return;

    const cleanId = normalizeTopicId(topicId);
    let nav = '';
    let sectionsHtml = '';

    if (cleanId) {
      const topic = findTopicById(HelperContent, cleanId);
      if (!topic) {
        sectionsHtml = `<p><em>Keine Hilfe gefunden für „${cleanId}“.</em></p>`;
      } else {
        const relatedEntries = getCategoryEntries(HelperContent, topic);
        const categoryName = topic.category || 'Allgemein';

        nav = `
          <div class="help-nav mb-3 border-bottom pb-2">
            <h6 class="text-muted mb-2">${categoryName}</h6>
            <ul class="nav flex-column small">
              ${relatedEntries.map(entry => `
                <li class="nav-item">
                  <a href="#" class="nav-link help-nav-link${entry.id === topic.id ? ' active fw-bold' : ''}" data-topic="${entry.id}">
                    ${entry.title}
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>
        `;

        sectionsHtml = `
          <section id="${topic.id}" class="mb-4">
            <h5>${topic.title}</h5>
            ${topic.text}
          </section>
        `;
      }
    } else {
      const { categories, sortedCategories } = groupEntriesByCategory(HelperContent);

      nav = sortedCategories.map(category => `
        <div class="help-nav mb-3 border-bottom pb-2">
          <h6 class="text-muted mb-2">${category}</h6>
          <ul class="nav flex-column small">
            ${categories[category].map(entry => `
              <li class="nav-item">
                <a href="#" class="nav-link help-nav-link" data-topic="${entry.id}">${entry.title}</a>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('');

      sectionsHtml = sortedCategories.map(category => `
        <h4 class="mt-3 mb-2">${category}</h4>
        ${categories[category].map(entry => `
          <section id="${entry.id}" class="mb-4">
            <h5>${entry.title}</h5>
            ${entry.text}
          </section>
        `).join('')}
      `).join('');
    }

    container.innerHTML = `
      <div class="help-wrapper" style="max-width:399px; margin:0 auto;">
        ${nav}
        <div class="help-content">${sectionsHtml}</div>
      </div>
    `;

    container.querySelectorAll('.help-nav-link').forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const linkedTopic = link.getAttribute('data-topic');
        if (linkedTopic) this.showTopic(linkedTopic);
      });
    });

    if (cleanId) {
      setTimeout(() => {
        document.getElementById(cleanId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  },

  /**
   * Öffnet kontextbezogene Hilfe.
   *
   * Standardverhalten:
   * - Bei aktivem Hilfe-Modus wird immer geöffnet.
   * - Außerhalb des Modus nur bei `forceOpen=true` (z. B. Hilfe-Button/F1).
   *
   * @param {string} topicId
   * @param {{forceOpen?: boolean}} options
   */
  showHelpTo(topicId, options = {}) {
    const cleanId = normalizeTopicId(topicId);
    if (!cleanId) return;

    const topic = findTopicById(HelperContent, cleanId);
    if (!topic) {
      console.warn('Keine Hilfe gefunden für:', cleanId);
      return;
    }

    if (!this.mode && !options.forceOpen) return;
    this.openSidebar(topic.id);
  },

  /**
   * Öffnet ein bestimmtes Thema direkt.
   * @param {string} topicId
   */
  showTopic(topicId) {
    this.showHelpTo(topicId, { forceOpen: true });
  }
};

if (typeof window !== 'undefined') {
  window.HelperManager = HelperManager;
  window.HelperContent = HelperContent;
}
