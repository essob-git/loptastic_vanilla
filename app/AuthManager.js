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


// /listify/app/AuthManager.js
export const AuthManager = (function(){
  let _me = null;

  async function me() {
    const res = await fetch('/listify/api/auth/me.php', { credentials: 'include' });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Auth Fehler');
    _me = j.data;
    return _me;
  }

  async function ensureLoggedIn() {
    const info = await me();
    if (!info.authenticated) {
      window.location.href = '/listify/login.php';
      return;
    }

    /*// User ins Projektsettings spiegeln
    const project = StateManager.getCurrentProject();
    if (project) {
      project.settings.userName = username();        // von AuthManager
      project.settings.department = department();    // von AuthManager
      StateManager.setCurrentProject(project);       // zurückschreiben
    }*/

    return info;
  }

  function isAdmin() { return !!(_me?.user?.role === 'admin'); }
  function username() {
    if (!_me?.user) return null;
    const u = _me.user;
    return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  }
  
  function department() {
    return _me?.user?.department || null;
  }
  function csrf() { return _me?.csrf || ''; }

  return { me, ensureLoggedIn, isAdmin, username, department, csrf };
})();
