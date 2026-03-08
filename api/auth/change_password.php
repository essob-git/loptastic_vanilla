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
$user = require_auth();
verify_csrf();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$old = (string)($in['old_password'] ?? '');
$new = (string)($in['new_password'] ?? '');

if ($old==='' || $new==='') json_err('Felder fehlen', 422);

$users = load_users();
foreach ($users as &$u) {
  if ($u['id'] === $user['id']) {
    if (!password_verify($old, $u['password_hash'] ?? '')) json_err('Altes Passwort falsch', 401);
    $u['password_hash'] = password_hash($new, PASSWORD_DEFAULT);
    $u['force_password_change'] = false;
    $u['updated_at'] = now_iso();
    save_users($users);
    auth_log("PASS CHANGE uid={$u['id']}");
    json_ok();
  }
}
json_err('User nicht gefunden', 404);
