<?php
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
if (!isset($_SESSION['uid'])) { header('Location: ' . loptastic_url('login.php')); exit; }
?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>LopTastic – Einstellungen</title>
  <link rel="stylesheet" href="assets/admin.css">
  <link rel="icon" type="image/x-icon" href="app/images/favicon.ico">
  <style>
    .container{max-width:95%;margin:40px auto;background:#fff;border-radius:16px;padding:24px;color:#0f172a}
    .topbar{display:flex;justify-content:space-between;align-items:center;color:#fff;padding:16px}
    .link{color:#fff;text-decoration:underline}
    .admin-nav{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
    .admin-nav a{padding:8px 12px;border-radius:8px;background:#e2e8f0;color:#0f172a;text-decoration:none;font-weight:600}
    .admin-nav a.active{background:#0f172a;color:#fff}
    .settings-grid{display:grid;grid-template-columns:minmax(220px,280px) 1fr;gap:20px}
    .section-list{border:1px solid #dbe1ea;border-radius:10px;padding:10px;height:max-content}
    .section-item{display:block;width:100%;text-align:left;border:0;background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:8px;cursor:pointer}
    .section-item.active{background:#cfe1ff}
    .editor{border:1px solid #dbe1ea;border-radius:10px;padding:14px}
    textarea{width:100%;min-height:420px;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;font-size:13px;border:1px solid #d0d6e0;border-radius:8px;padding:10px}
    .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
    .btn{padding:8px 12px;border-radius:8px;border:0;background:#0f172a;color:#fff;cursor:pointer}
    .btn.secondary{background:#e2e8f0;color:#0f172a}
    .hint{font-size:12px;color:#475569;margin-top:8px}
    @media (max-width:900px){.settings-grid{grid-template-columns:1fr}}
  </style>
</head>
<body class="splash-bg">
  <div class="topbar">
    <div><strong>loptastic</strong> – Einstellungen</div>
    <div><a class="link" href="./">Zurück zur App</a></div>
  </div>

  <div class="container">
    <nav class="admin-nav" aria-label="Admin Navigation">
      <a href="./user_admin.php">Userverwaltung</a>
      <a href="./admin_settings.php" class="active">Einstellungen</a>
    </nav>

    <h1 style="margin-top:0">Systemeinstellungen</h1>
    <div class="settings-grid">
      <div class="section-list" id="section-list"></div>
      <div class="editor">
        <h2 id="section-title" style="margin-top:0">Bereich wählen</h2>
        <p id="section-description"></p>
        <textarea id="settings-json" aria-label="Settings JSON"></textarea>
        <div class="actions">
          <button class="btn secondary" id="btn-reload" type="button">Neu laden</button>
          <button class="btn" id="btn-save" type="button">Speichern</button>
        </div>
    </div>
  </div>

  <script src="assets/admin-settings.js" defer></script>
</body>
</html>
