<?php
/**
 * Listify – Community Edition
 * Projektmanagement-Tool
 * Copyright (c) 2025 Sven Bosse
 */

declare(strict_types=1);
ini_set('session.use_strict_mode', '1');
session_start([
  'cookie_httponly' => true,
  'cookie_secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'cookie_samesite' => 'Lax',
  'use_strict_mode' => true,
]);
if (!isset($_SESSION['uid'])) { header('Location: /listify/login.php'); exit; }
?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Listify – Userverwaltung</title>
  <link rel="stylesheet" href="/listify/assets/admin.css">
  <style>
    .container{max-width:95%;margin:40px auto;background:#fff;border-radius:16px;padding:24px}
    table{width:100%;border-collapse:collapse;margin-top:16px; color: black}
    th,td{border-bottom:1px solid #e7eaf0;padding:10px;font-size:14px;vertical-align:top}
    thead th{font-weight:700;text-align:left}
    .row{display:flex;gap:10px;flex-wrap:wrap}
    input,select,textarea{padding:8px;border-radius:8px;border:1px solid #d0d6e0}
    textarea{min-height:90px;width:100%;font-family:inherit}
    .toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
    .btn{padding:8px 12px;border-radius:8px;border:0;background:#0f172a;color:#fff;cursor:pointer}
    .btn.secondary{background:#e2e8f0;color:#0f172a}
    .badge{padding:3px 8px;border-radius:999px;font-size:12px}
    .badge.admin{background:#dbeafe;color:#1e40af}
    .badge.user{background:#e5e7eb;color:#111827}
    .badge.locked{background:#fee2e2;color:#991b1b}
    .topbar{display:flex;justify-content:space-between;align-items:center;color:#fff;padding:16px}
    .admin-nav{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 16px}
    .admin-nav a{display:inline-block;padding:8px 12px;border:1px solid rgba(255,255,255,.45);border-radius:999px;color:#fff;text-decoration:none;background:rgba(0,0,0,.15)}
    .admin-nav a:hover{background:rgba(0,0,0,.3)}
    .link{color:#fff;text-decoration:underline}
    .settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-top:20px}
    .settings-card{border:1px solid #e7eaf0;border-radius:12px;padding:16px}
    .settings-card h3{margin-top:0}
    .hint{font-size:12px;color:#5f6b7a;margin-top:4px}
    .full-width{width:100%}
  </style>
</head>
<body class="splash-bg">
  <div class="topbar">
    <div><strong>listify</strong> – Adminbereich</div>
    <div><a class="link" href="/listify/">Zurück zur App</a></div>
  </div>
  <nav class="admin-nav" aria-label="Admin-Menü">
    <a href="#users">Benutzerverwaltung</a>
    <a href="#settings">Einstellungen</a>
    <a href="/listify/">App</a>
  </nav>
  <div class="container">
    <h2 id="users">Benutzerverwaltung</h2>
    <div class="toolbar">
      <div class="row">
        <input id="first_name" placeholder="Vorname" aria-label="Vorname">
        <input id="last_name" placeholder="Nachname" aria-label="Nachname">
        <input id="userid" placeholder="UserID" aria-label="UserID">
        <input id="email" placeholder="E-Mail" aria-label="E-Mail">
        <select id="department" aria-label="Abteilung">
          <option value="">-- Abteilung wählen --</option>
        </select>
        <select id="role" aria-label="Rolle">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <input id="password" placeholder="Initial-Passwort" aria-label="Initial-Passwort">
      </div>
      <button class="btn" id="btn-create">Anlegen</button>
    </div>

    <table id="tbl" aria-label="Benutzerliste">
      <thead>
        <tr>
          <th>Name</th>
          <th>UserID / E-Mail</th>
          <th>Rolle</th>
          <th>Status</th>
          <th>Abteilung</th>
          <th>Letzter Login</th>
          <th>Erstellt</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>

    <h2 id="settings" style="margin-top:26px;">System- und Listify-Einstellungen</h2>
    <div class="settings-grid">
      <section class="settings-card">
        <h3>Registrierungseinstellungen</h3>
        <label for="registration_mode">Registrierungsmodus</label>
        <select id="registration_mode" class="full-width">
          <option value="closed">geschlossen</option>
          <option value="approval">Freigabe durch Admin</option>
          <option value="open">sofort aktiv</option>
        </select>
        <label for="registration_departments">Abteilungen (eine Zeile pro Eintrag)</label>
        <textarea id="registration_departments"></textarea>
      </section>

      <section class="settings-card">
        <h3>Listify Standardwerte</h3>
        <label for="theme">Theme</label>
        <input id="theme" class="full-width" placeholder="light">

        <div class="row">
          <label><input type="checkbox" id="createdate_dateonly"> itemEditor_createdate_DateOnly</label>
          <label><input type="checkbox" id="deadline_dateonly"> itemEditor_deadline_DateOnly</label>
        </div>

        <label for="comment_limit">commentLimit</label>
        <input id="comment_limit" type="number" min="1" max="5000" class="full-width">

        <label for="comment_categories">commentCategories (eine Zeile pro Eintrag)</label>
        <textarea id="comment_categories"></textarea>

        <label for="lists_phase">lists_phase (Format: Schlüssel=Wert pro Zeile)</label>
        <textarea id="lists_phase"></textarea>
        <div class="hint">Beispiel: 1=Projektvorbereitung</div>
      </section>
    </div>

    <div style="margin-top: 16px;">
      <button class="btn" id="btn-save-settings">Settings speichern</button>
    </div>
  </div>
  <script src="/listify/assets/user-admin.js" defer></script>
</body>
</html>
