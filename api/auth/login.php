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

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$login = trim((string)($body['login'] ?? ''));
$pass  = (string)($body['password'] ?? '');

if ($login === '' || $pass === '') json_err('Login und Passwort erforderlich', 422);
if (strlen($login) > MAX_LOGIN_LENGTH || strlen($pass) > 1024) json_err('Ungültige Zugangsdaten', 401);

$users = load_users();
$u = user_by_login($login, $users);

// generische Antwort, um User-Enumeration zu erschweren
if (!$u) {
  // Timing-Angleich für unbekannte Accounts
  password_verify($pass, '$2y$10$wUg0Uy4vA5YxK4fEmNfST.9f7QFq7fNfX6aZ0f5BP6vJm6D2Y9y4m');
  auth_log('LOGIN FAIL user=UNKNOWN login=' . clean_log_fragment($login));
  json_err('Ungültige Zugangsdaten', 401);
}
if (!empty($u['locked'])) json_err('Account gesperrt', 403);
if (!can_attempt_login($u)) json_err('Zu viele Versuche – bitte später erneut', 429);

if (!password_verify($pass, $u['password_hash'] ?? '')) {
  on_failed_login($u);
  // persist fail
  foreach ($users as &$ref) { if ($ref['id'] === $u['id']) { $ref = $u; break; } }
  save_users($users);
  auth_log('LOGIN FAIL userid=' . clean_log_fragment((string)$u['userid']) . ' id=' . clean_log_fragment((string)$u['id']));
  json_err('Ungültige Zugangsdaten', 401);
}

session_regenerate_id(true);
$_SESSION['uid'] = $u['id'];

on_success_login($u);
foreach ($users as &$ref) { if ($ref['id'] === $u['id']) { $ref = $u; break; } }
save_users($users);

auth_log('LOGIN OK userid=' . clean_log_fragment((string)$u['userid']) . ' id=' . clean_log_fragment((string)$u['id']));

json_ok([
  'csrf' => csrf_token(),
  'user' => [
    'id'         => $u['id'],
    'userid'     => $u['userid'],
    'email'      => $u['email'],
    'first_name' => $u['first_name'],
    'last_name'  => $u['last_name'],
    'role'       => $u['role'] ?? 'user',
    'last_login_at' => $u['last_login_at'] ?? null,
    'created_at' => $u['created_at'] ?? null,
  ]
]);
