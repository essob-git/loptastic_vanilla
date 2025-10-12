<?php
// /listify/login.php
declare(strict_types=1);
ini_set('session.use_strict_mode', '1');
session_start([
  'cookie_httponly' => true,
  'cookie_secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'cookie_samesite' => 'Lax',
  'use_strict_mode' => true,
]);
if (isset($_SESSION['uid'])) {
  header('Location: /listify/');
  exit;
}
?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Listify – Login</title>
  <link rel="stylesheet" href="/listify/assets/login.css">
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
          <p style="margin-top: 50px;">Noch keinen Account? <a href="/listify/register.php">Jetzt Registrieren</a></p>
          <p id="msg" class="msg"></p>
        </form>
        
      </div>

      <!-- Rechte Seite: Logo -->
      <div class="login-right">
        <div class="logo-box">
          <img src="app/images/listify_background_white.png" alt="listify Logo" id="splash-logo">

        </div>
      </div>
    </div>
  </div>


  <script src="/listify/assets/login.js" defer></script>
</body>
</html>

