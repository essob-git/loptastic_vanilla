/**
 * LopTastic – Community Edition
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


// /loptastic/app/AuthManager.js
export const AuthManager = (function(){
  let _me = null;
  const appBasePath = window.location.pathname
    .replace(/\/[^/]*$/, '')
    .replace(/\/$/, '');
  const appUrl = (path) => `${appBasePath}${path.startsWith('/') ? path : `/${path}`}`;

  async function me() {
    const res = await fetch(appUrl('/api/auth/me.php'), { credentials: 'include' });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Auth Fehler');
    _me = j.data;
    return _me;
  }

  async function ensureLoggedIn() {
    const info = await me();
    if (!info.authenticated) {
      window.location.href = appUrl('/login.php');
      return;
    }

    if (info?.user?.force_password_change) {
      window.location.href = appUrl('/pw.php');
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
