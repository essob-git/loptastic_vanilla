<?php
/**
 * Listify – Community Edition
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
 * Kontakt: https://github.com/essob-git
 *
 * Hinweis:
 * - Externe Bibliotheken behalten ihre eigenen Lizenzen.
 */

require __DIR__ . '/../_bootstrap.php';

$settings = load_app_settings(); // globale Konfig (z. B. aus settings.json oder SQLite)
if (($settings['registration_mode'] ?? 'closed') === 'closed') {
    json_err('Registrierung ist deaktiviert', 403);
}

$departments = $settings['departments'] ?? [];



$in = json_decode(file_get_contents('php://input'), true) ?? [];
$first = trim((string)($in['first_name'] ?? ''));
$last  = trim((string)($in['last_name'] ?? ''));
$email = trim((string)($in['email'] ?? ''));
$userid= trim((string)($in['userid'] ?? ''));
$pass  = (string)($in['password'] ?? '');
$dept = trim((string)($in['department'] ?? ''));

if ($first===''||$last===''||$userid===''||$email===''||$pass==='') {
    json_err('Alle Felder erforderlich', 422);
}
if ($dept !== '' && !in_array($dept, $departments, true)) {
    json_err('Ungültige Abteilung', 422);
}
$users = load_users();
if (user_by_login($userid, $users) || user_by_login($email, $users)) {
    json_err('UserID oder E-Mail bereits vergeben', 409);
}

$id = bin2hex(random_bytes(8));
$now = now_iso();

$newUser = [
    'id' => $id,
    'first_name' => $first,
    'last_name'  => $last,
    'userid'     => $userid,
    'email'      => $email,
    'role'       => 'user',
    'department' => $dept,  
    'locked'     => false,
    'pending'    => false,
    'created_at' => $now,
    'updated_at' => $now,
    'last_login_at' => null,
    'password_hash' => password_hash($pass, PASSWORD_DEFAULT),
];

$mode = $settings['registration_mode'] ?? 'approval';
if ($mode === 'approval') {
    $newUser['pending'] = true;
    $newUser['locked']  = true;
}

$users[] = $newUser;
save_users($users);

json_ok(['pending' => $newUser['pending']], 201);
