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

require __DIR__ . '/../_bootstrap.php';

if (!isset($_SESSION['uid'])) {
  json_ok(['authenticated' => false, 'csrf' => csrf_token()]);
}
$users = load_users();
foreach ($users as $u) {
  if (($u['id'] ?? null) === $_SESSION['uid']) {
    if (!empty($u['locked'])) json_err('Account gesperrt', 403);
    json_ok([
      'authenticated' => true,
      'csrf' => csrf_token(),
      'user' => [
        'id' => $u['id'],
        'userid' => $u['userid'],
        'email' => $u['email'],
        'first_name' => $u['first_name'],
        'last_name' => $u['last_name'],
        'department' => $u['department'] ?? null,
        'role' => $u['role'] ?? 'user',
        'force_password_change' => $u['force_password_change'] ?? false,
        'last_login_at' => $u['last_login_at'] ?? null,
        'created_at' => $u['created_at'] ?? null
      ]
    ]);
  }
}
json_ok(['authenticated' => false, 'csrf' => csrf_token()]);
