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

// helpManager.js
import { UIManager } from './uiManager.js';
import { HelperContent } from './helperContent.js';

export const HelperManager = {
  mode: false, // false = Standard (Switch aus), true = Hilfe-Sidebar (Switch an)
  sidebarInitialized: false, // sorgt für einmaliges Setup

    setMode(force) {
    this.mode = !!force;
    const switchEl = document.getElementById("helpModeSwitch");
    if (switchEl) switchEl.checked = this.mode;
    if (this.mode) {
      document.body.classList.add("help-mode");
      this.openSidebar();
    } else {
      document.body.classList.remove("help-mode");
      // Schließen nur, wenn Sidebar offen
      const sidebar = bootstrap.Offcanvas.getInstance("#helpSidebar");
      if (sidebar) sidebar.hide();
    }
  },


  toggleMode(force = null) {
    if (force !== null) {
      this.setMode(force);
    } else {
      this.setMode(!this.mode);
    }
  },

  /**
   * Öffnet die Sidebar (Help-Modus)
   * @param {string|null} topicId
   */
  openSidebar(topicId = null) {
      let sidebarEl = document.getElementById("helpSidebar");
      if (!sidebarEl) {
        sidebarEl = document.createElement("div");
        sidebarEl.id = "helpSidebar";
        sidebarEl.className = "offcanvas offcanvas-end";
        sidebarEl.tabIndex = -1;
        sidebarEl.style.width = "399px";
        sidebarEl.innerHTML = `
          <div class="offcanvas-header">
            <h5 class="offcanvas-title">Listify Hilfe</h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
          </div>
          <div class="offcanvas-body overflow-auto">
            <div id="helpContent"></div>
          </div>
        `;
        document.body.appendChild(sidebarEl);
        document.getElementById(sidebarEl).addEventListener("hidden.bs.offcanvas", () => alert("TEST"));

        // Eventlistener am DOM-Element
        sidebarEl.addEventListener('hidden.bs.offcanvas', () => {
          console.log("[HelperManager] Sidebar wirklich geschlossen (EVENT)");
          HelperManager.setMode(false); // Das synchronisiert Switch, Klasse und Logik!
        });

        // Bootstrap initialisieren
        bootstrap.Offcanvas.getOrCreateInstance(sidebarEl, { backdrop: false, scroll: true });
      }
      // Instanz holen und öffnen
      const sidebar = bootstrap.Offcanvas.getOrCreateInstance("#helpSidebar", { backdrop: false, scroll: true });
      sidebar.show();
      this.renderContent(topicId);
    },

  /**
   * Rendert den Handbuchinhalt (für Sidebar)
   * @param {string|null} topicId
   */
  renderContent(topicId = null) {
    const container = document.getElementById("helpContent");
    if (!container) {
      console.warn("⚠️ helpContent-Container fehlt!");
      return;
    }

    let nav = "";
    let sectionsHtml = "";

    if (topicId) {
      // ---------- Nur ein Artikel + Kategorie-Navigation ----------
      const cleanId = topicId.replace('#', '');
      const section = HelperContent.find(sec => sec.id === cleanId);

      if (section) {
        const category = section.category || "Allgemein";
        const catArticles = HelperContent
          .filter(sec => (sec.category || "Allgemein") === category)
          .sort((a, b) => a.title.localeCompare(b.title));

        nav = `
          <div class="help-nav mb-3 border-bottom pb-2">
            <h6 class="text-muted mb-2">${category}</h6>
            <ul class="nav flex-column small">
              ${catArticles.map(sec => `
                <li class="nav-item">
                  <a href="#" class="nav-link help-nav${sec.id === section.id ? " active fw-bold" : ""}" data-topic="${sec.id}">
                    ${sec.title}
                  </a>
                </li>`).join("")}
            </ul>
          </div>
        `;

        sectionsHtml = `
          <section id="${section.id}" class="mb-4">
            <h5>${section.title}</h5>
            ${section.text}
          </section>
        `;
      } else {
        sectionsHtml = `<p><em>Keine Hilfe gefunden für ${topicId}</em></p>`;
      }
    } else {
      // ---------- Alles, nach Kategorien gruppiert ----------
      const categories = {};
      HelperContent.forEach(sec => {
        const cat = sec.category || "Allgemein";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(sec);
      });

      const sortedCats = Object.keys(categories).sort();

      nav = sortedCats.map(cat => {
        const items = categories[cat]
          .sort((a, b) => a.title.localeCompare(b.title));
        if (items.length === 0) return "";
        const links = items.map(sec => `
            <li class="nav-item">
              <a href="#" class="nav-link help-nav" data-topic="${sec.id}">
                ${sec.title}
              </a>
            </li>`
          ).join("");
        return `
          <div class="help-nav mb-3 border-bottom pb-2">
            <h6 class="text-muted mb-2">${cat}</h6>
            <ul class="nav flex-column small">${links}</ul>
          </div>
        `;
      }).join("");

      // Inhalte gruppiert
      sectionsHtml = sortedCats.map(cat => {
        const items = categories[cat]
          .sort((a, b) => a.title.localeCompare(b.title));
        if (items.length === 0) return "";
        const content = items.map(sec => `
            <section id="${sec.id}" class="mb-4">
              <h5>${sec.title}</h5>
              ${sec.text}
            </section>`
          ).join("");
        return `<h4 class="mt-3 mb-2">${cat}</h4>${content}`;
      }).join("");
    }

    // Rendern mit max. 399px Breite
    container.innerHTML = `
      <div class="help-wrapper" style="max-width:399px; margin:0 auto;">
        ${nav}
        <div class="help-content">
          ${sectionsHtml}
        </div>
      </div>
    `;

    // Event-Delegation: Alle Links neu verdrahten!
    container.querySelectorAll('.help-nav').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const topicId = link.getAttribute('data-topic');
        if (topicId) {
          HelperManager.showTopic('#' + topicId);
        } else {
          console.warn("⚠️ Klick ohne gültiges data-topic");
        }
      });
    });

    if (topicId) {
      setTimeout(() => {
        document.getElementById(topicId.replace('#', ''))?.scrollIntoView({
          behavior: "smooth"
        });
      }, 100);
    }
  },

  /**
   * Zeigt gezielt ein Thema in der Sidebar
   */
  showHelpTo(topicId) {
    if (!topicId) return;

    const cleanId = topicId.replace('#', '');
    const section = HelperContent.find(sec => sec.id === cleanId);

    if (!section) {
      console.warn("Keine Hilfe gefunden für:", topicId);
      return;
    }

    const idRef = `#${section.id}`;

    if (this.mode) {
      // Sidebar ist Modus → direkt neu rendern
      this.renderContent(idRef);
      // Sidebar öffnen, falls noch nicht sichtbar
      const sidebar = bootstrap.Offcanvas.getOrCreateInstance("#helpSidebar", {
        backdrop: false,
        scroll: true
      });
      sidebar.show();
    }
  },

  /**
   * Kontextbezogene Hilfe öffnen (aus der Navigation)
   */
  showTopic(topicId) {
    this.openSidebar(topicId);
  }
};

// Mache HelperManager im Window-Objekt global verfügbar (für Event-Handler in Eventlistener)
if (typeof window !== "undefined") {
  window.HelperManager = HelperManager;
    window.HelperContent = HelperContent;
}
