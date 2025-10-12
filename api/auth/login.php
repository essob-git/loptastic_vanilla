<?php
require __DIR__ . '/../_bootstrap.php';

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$login = trim((string)($body['login'] ?? ''));
$pass  = (string)($body['password'] ?? '');

if ($login === '' || $pass === '') json_err('Login und Passwort erforderlich', 422);

$users = load_users();
$u = user_by_login($login, $users);

// generische Antwort, um User-Enumeration zu erschweren
if (!$u) {
  auth_log("LOGIN FAIL user=UNKNOWN login={$login}");
  json_err('Ungültige Zugangsdaten', 401);
}
if (!empty($u['locked'])) json_err('Account gesperrt', 403);
if (!can_attempt_login($u)) json_err('Zu viele Versuche – bitte später erneut', 429);

if (!password_verify($pass, $u['password_hash'] ?? '')) {
  on_failed_login($u);
  // persist fail
  foreach ($users as &$ref) { if ($ref['id'] === $u['id']) { $ref = $u; break; } }
  save_users($users);
  auth_log("LOGIN FAIL userid={$u['userid']} id={$u['id']}");
  json_err('Ungültige Zugangsdaten', 401);
}

session_regenerate_id(true);
$_SESSION['uid'] = $u['id'];

on_success_login($u);
foreach ($users as &$ref) { if ($ref['id'] === $u['id']) { $ref = $u; break; } }
save_users($users);

auth_log("LOGIN OK userid={$u['userid']} id={$u['id']}");

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
