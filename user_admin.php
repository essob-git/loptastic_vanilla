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

// ./user-admin.php
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
  <title>LopTastic – Userverwaltung</title>
  <link rel="stylesheet" href="assets/admin.css">
  <link rel="icon" type="image/x-icon" href="app/images/favicon.ico">
  <style>
    .container{max-width:95%;margin:40px auto;background:#fff;border-radius:16px;padding:24px}
    table{width:100%;border-collapse:collapse;margin-top:16px; color: black}
    th,td{border-bottom:1px solid #e7eaf0;padding:10px;font-size:14px}
    thead th{font-weight:700;text-align:left}
    .row{display:flex;gap:10px;flex-wrap:wrap}
    input,select{padding:8px;border-radius:8px;border:1px solid #d0d6e0}
    .toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
    .btn{padding:8px 12px;border-radius:8px;border:0;background:#0f172a;color:#fff;cursor:pointer}
    .btn.secondary{background:#e2e8f0;color:#0f172a}
    .badge{padding:3px 8px;border-radius:999px;font-size:12px}
    .badge.admin{background:#dbeafe;color:#1e40af}
    .badge.user{background:#e5e7eb;color:#111827}
    .badge.locked{background:#fee2e2;color:#991b1b}
    .topbar{display:flex;justify-content:space-between;align-items:center;color:#fff;padding:16px}
    .link{color:#fff;text-decoration:underline}
  </style>
</head>
<body class="splash-bg">
  <div class="topbar">
    <div><strong>loptastic</strong> – Userverwaltung</div>
    <div><a class="link" href="./">Zurück zur App</a></div>
  </div>
  <div class="container">
    <nav style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px" aria-label="Admin Navigation">
      <a style="padding:8px 12px;border-radius:8px;background:#0f172a;color:#fff;text-decoration:none;font-weight:600" href="./user_admin.php">Userverwaltung</a>
      <a style="padding:8px 12px;border-radius:8px;background:#e2e8f0;color:#0f172a;text-decoration:none;font-weight:600" href="./admin_settings.php">Einstellungen</a>
    </nav>
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
          <th>Passwortstatus</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
  <script src="assets/user-admin.js" defer></script>
</body>
</html>
