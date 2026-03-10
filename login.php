<?php
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

// ./login.php
declare(strict_types=1);
require_once __DIR__ . '/lib_app_base.php';
ini_set('session.use_strict_mode', '1');
session_start([
  'cookie_httponly' => true,
  'cookie_secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'cookie_samesite' => 'Lax',
 'cookie_path'     => loptastic_url('/'),
  'use_strict_mode' => true,
]);
if (isset($_SESSION['uid'])) {
  $usersFile = __DIR__ . '/data/users.json';
  $isValidSessionUser = false;

  if (file_exists($usersFile)) {
    $users = json_decode(file_get_contents($usersFile) ?: '[]', true);
    if (is_array($users)) {
      foreach ($users as $u) {
        if (($u['id'] ?? null) === $_SESSION['uid']) {
          $isValidSessionUser = true;
          break;
        }
      }
    }
  }

  if ($isValidSessionUser) {
    header('Location: ' . loptastic_url('/'));
    exit;
  }

  // Verwaiste Session (User gelöscht/inkonsistent) bereinigen,
  // damit kein Redirect-Loop login.php <-> index.php entsteht.
  $_SESSION = [];
  session_destroy();

}
?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LopTastic – Login</title>
  <link rel="stylesheet" href="assets/login.css">
</head>
<body class="splash-bg">
  <div class="login-wrapper">
    <div class="login-card">
      <!-- Linke Seite: Login -->
      <div class="login-left">
        <h2>Anmelden</h2>
        <form id="login-form">
          <div class="form-group">
            <label for="login">Benutzername oder E-Mail</label>
            <input type="text" id="login" autocomplete="username" required>
          </div>
          <div class="form-group">
            <label for="password">Passwort</label>
            <input type="password" id="password" autocomplete="current-password" required>
          </div>
          <button type="submit" id="btn-login">Login</button>
          <p style="margin-top: 50px;">Noch keinen Account? <a href="register.php">Jetzt Registrieren</a></p>
          <p id="msg" class="msg"></p>
        </form>
        
      </div>

      <!-- Rechte Seite: Logo -->
      <div class="login-right">
        <div class="logo-box">
          <img src="app/images/loptastic_background_white.png" alt="loptastic Logo" id="splash-logo">

        </div>
      </div>
    </div>
  </div>


  <script src="assets/login.js" defer></script>
</body>
</html>

