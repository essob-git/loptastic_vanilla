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

// /loptastic/index.php
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

$usersFile = __DIR__ . '/data/users.json';
$currentUser = null;
if (file_exists($usersFile)) {
  $users = json_decode(file_get_contents($usersFile) ?: '[]', true);
  if (is_array($users)) {
    foreach ($users as $u) {
      if (($u['id'] ?? null) === $_SESSION['uid']) {
        $currentUser = $u;
        break;
      
      }
    }
  }
}
if ($currentUser === null) {
  // Verwaiste Session (User existiert nicht mehr) aufräumen, damit
  // der Client nicht in einen Redirect-Loop über AuthManager läuft.
  $_SESSION = [];
  session_destroy();
  header('Location: /loptastic/login.php');
  exit;
}

if (!empty($currentUser['force_password_change'])) {
  header('Location: /loptastic/pw.php');
  exit;
}
readfile(__DIR__ . '/app/index.html');
