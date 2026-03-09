<?php
/**
 * LopTastic – Community Edition
 * Projektmanagement-Tool
 */
declare(strict_types=1);
ini_set('session.use_strict_mode', '1');
session_start([
  'cookie_httponly' => true,
  'cookie_secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'cookie_samesite' => 'Lax',
 'cookie_path'     => '/loptastic/',
  'use_strict_mode' => true,
]);
if (!isset($_SESSION['uid'])) {
  header('Location: /loptastic/login.php');
  exit;
}
?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LopTastic – Passwort ändern</title>
  <link rel="stylesheet" href="/loptastic/assets/login.css">
  <style>
    .pw-rule { padding:4px 8px; border-radius:8px; background:#f8fafc; border:1px solid #e2e8f0; }
    .pw-rule.ok { background:#f0fdf4; border-color:#86efac; color:#166534; }
    .pw-rule.fail { background:#fef2f2; border-color:#fecaca; color:#991b1b; }
    .pw-rule-icon { display:inline-block; min-width:18px; font-weight:700; }
  </style>
</head>
<body class="splash-bg">
  <div class="login-wrapper">
    <div class="login-card" style="max-width: 900px;">
      <div class="login-left" style="width:100%;">
        <h2>Passwort ändern</h2>
        <p id="hint" class="msg" style="display:block;color:#9f1239;"></p>

        <form id="change-password-form">
          <div class="form-group">
            <label for="old_password">Aktuelles Passwort</label>
            <input type="password" id="old_password" autocomplete="current-password" required>
          </div>
          <div class="form-group">
            <label for="new_password">Neues Passwort</label>
            <input type="password" id="new_password" autocomplete="new-password" required>
          </div>
          <div id="password-rules" style="display:grid;gap:6px;margin:-6px 0 12px 0;font-size:14px;color:#334155;"></div>
          <div class="form-group">
            <label for="new_password2">Neues Passwort wiederholen</label>
            <input type="password" id="new_password2" autocomplete="new-password" required>
          </div>

          <button type="submit" id="btn-change">Speichern</button>
          <p id="msg" class="msg"></p>
          <p style="margin-top: 20px;"><a href="/loptastic/">Zurück zur App</a></p>
        </form>
      </div>
    </div>
  </div>

  <script src="/loptastic/assets/change-password.js" defer></script>
</body>
</html>
