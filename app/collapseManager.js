/**
 * Listify - Projektmanagement Tool
 * Copyright (c) 2025 Sven Bosse
 *
 * Diese Datei ist Teil von Listify.
 * 
 * Lizenz: MIT (https://opensource.org/licenses/MIT)
 * 
 * Hinweis:
 * - Nutzung, Veränderung und Weitergabe sind unter Beachtung der Lizenz erlaubt.
 * - Externe Bibliotheken behalten ihre eigenen Lizenzen.
 */


// collapseManager.js – Session-only State (kein LocalStorage), initial alles offen
(() => {
  let ROOT = null;
  let initialized = false;

  // Merker NUR für die aktuelle Session (lebt solange die Seite offen ist)
  const sessionState = Object.create(null); // { [id: string]: boolean }  true = collapsed

  const getChildrenBox = (headerCard) => {
    let el = headerCard.nextElementSibling;
    while (el && !el.classList.contains('children-container')) el = el.nextElementSibling;
    return el || null;
  };

  const ensureToggles = () => {
    if (!ROOT) return;
    ROOT.querySelectorAll('.item-card.item-h1, .item-card.item-h2').forEach(card => {
      if (card.querySelector('.toggle-children-btn')) return;
      const title = card.querySelector('.card-title');
      if (!title) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toggle-children-btn';
      btn.setAttribute('aria-label', 'Unterpunkte ein-/ausklappen');
      btn.innerHTML = '<i class="bi bi-chevron-down"></i>';
      title.prepend(btn);
    });
  };

  const setCollapsed = (card, collapsed, recursive = false) => {
    const id = card.getAttribute('data-item-id');
    const box = getChildrenBox(card);

    card.classList.toggle('is-collapsed', collapsed);
    if (box) box.classList.toggle('is-collapsed', collapsed);

    // Session-State setzen
    if (id) sessionState[id] = !!collapsed;

    if (recursive && box) {
      box.querySelectorAll('.item-card.item-h1, .item-card.item-h2').forEach(childHeader => {
        setCollapsed(childHeader, collapsed, true);
      });
    }
  };

  // Anwenden des Session-States auf alle Header im DOM
  const applySessionState = () => {
    if (!ROOT) return;
    ROOT.querySelectorAll('.item-card.item-h1, .item-card.item-h2').forEach(card => {
      const id = card.getAttribute('data-item-id');
      // Default: offen (collapsed = false), falls noch nicht gesehen
      const collapsed = id ? !!sessionState[id] : false;
      setCollapsed(card, collapsed, false);
      // Falls kein Eintrag existierte: explizit auf "offen" registrieren
      if (id != null && !(id in sessionState)) sessionState[id] = false;
    });
  };

  const onClick = (e) => {
    const btn = e.target.closest('.toggle-children-btn');
    if (!btn) return;
    const card = e.target.closest('.item-card.item-h1, .item-card.item-h2');
    if (!card) return;
    const collapsed = !card.classList.contains('is-collapsed');
    const recursive = e.altKey || e.metaKey || e.ctrlKey;
    setCollapsed(card, collapsed, recursive);
  };

  const attach = () => {
    if (!ROOT || initialized) return;
    ROOT.addEventListener('click', onClick);
    initialized = true;
  };

  const detach = () => {
    if (!ROOT || !initialized) return;
    ROOT.removeEventListener('click', onClick);
    initialized = false;
  };

  window.CollapseManager = {
    init({ rootSelector = '#items-container' } = {}) {
      ROOT = document.querySelector(rootSelector);
      if (!ROOT) return;
      ensureToggles();
      applySessionState(); // <- initial: alles offen (weil Default = false)
      attach();
    },
    onRender() {
      if (!ROOT) return;
      ensureToggles();
      applySessionState(); // <- nach jedem Re-Render Session-Status anwenden
    },
    expandAll() {
      if (!ROOT) return;
      ROOT.querySelectorAll('.item-card.item-h1, .item-card.item-h2').forEach(card => {
        setCollapsed(card, false, true);
      });
    },
    collapseAll() {
      if (!ROOT) return;
      ROOT.querySelectorAll('.item-card.item-h1, .item-card.item-h2').forEach(card => {
        setCollapsed(card, true, true);
      });
    },
    // Optional: nützlich, falls du für neue Liste hart resetten willst:
    resetSession() {
      for (const k in sessionState) delete sessionState[k];
      this.onRender();
    },
    destroy() { detach(); ROOT = null; }
  };
})();
