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

$settings = load_app_settings(); // globale Konfig (z. B. aus settings.json oder SQLite)
if (($settings['registration_mode'] ?? 'closed') === 'closed') {
    json_err('Registrierung ist deaktiviert', 403);
}

$departments = $settings['departments'] ?? [];



$in = json_decode(file_get_contents('php://input'), true) ?? [];
$first = validate_name_or_fail((string)($in['first_name'] ?? ''), 'Vorname');
$last  = validate_name_or_fail((string)($in['last_name'] ?? ''), 'Nachname');
$email = validate_email_or_fail((string)($in['email'] ?? ''));
$userid= validate_userid_or_fail((string)($in['userid'] ?? ''));
$pass  = validate_password_or_fail((string)($in['password'] ?? ''), 'Passwort erfüllt die Vorgaben nicht');
$dept = trim((string)($in['department'] ?? ''));

$botProtection = get_bot_protection_settings();
if (!empty($botProtection['enabled'])) {
    $bot = $in['bot_protection'] ?? null;
    if (!is_array($bot)) {
        json_err('Registrierung konnte nicht verifiziert werden', 422);
    }

    $token = (string)($bot['token'] ?? '');
    $honeypot = trim((string)($bot['honeypot'] ?? ''));
    $expectedToken = (string)($_SESSION['register_bot_token'] ?? '');
    $issuedAt = (int)($_SESSION['register_bot_issued_at'] ?? 0);

    if ($expectedToken === '' || $token === '' || !hash_equals($expectedToken, $token)) {
        json_err('Registrierung konnte nicht verifiziert werden', 422);
    }

    if ($honeypot !== '') {
        json_err('Registrierung konnte nicht verifiziert werden', 422);
    }

    if ($issuedAt <= 0 || (time() - $issuedAt) < (int)$botProtection['min_form_fill_seconds']) {
        json_err('Registrierung konnte nicht verifiziert werden', 422);
    }

    unset($_SESSION['register_bot_token'], $_SESSION['register_bot_issued_at']);
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
