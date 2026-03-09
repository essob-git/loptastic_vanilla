<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LopTastic – Registrierung</title>
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
    <div class="login-card">
      <!-- Linke Seite: Registrierung -->
      <div class="login-left">
        <h2>Registrieren</h2>
        <form id="register-form">
          <div class="form-group">
            <label for="first">Vorname</label>
            <input type="text" id="first" required>
          </div>
          <div class="form-group">
            <label for="last">Nachname</label>
            <input type="text" id="last" required>
          </div>
          <div class="form-group">
            <label for="userid">Benutzername (z.b. dab123)</label>
            <input type="text" id="userid" required>
          </div>
          <div class="form-group">
            <label for="email">E-Mail</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label for="department">Abteilung</label>
            <select id="department" required></select>
          </div>
          <div class="form-group">
            <label for="pass">Passwort</label>
            <input type="password" id="pass" required>
          </div>
          <div id="password-rules" style="display:grid;gap:6px;margin:-6px 0 12px 0;font-size:14px;color:#334155;"></div>
          <div class="form-group">
            <label for="pass2">Passwort wiederholen</label>
            <input type="password" id="pass2" required>
          </div>
          <button type="submit" id="btn-register">Registrieren</button>
          <p id="msg" class="msg"></p>
          <p class="small" style="margin-top: 50px;">
            Schon einen Account? <a href="/loptastic/login.php">besser zum Login</a>
          </p>
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
  <script src="/loptastic/assets/register.js" defer></script>
</body>
</html>
