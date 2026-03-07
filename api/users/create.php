<?php
// /loptastic/api/users/create.php
require __DIR__ . '/../_bootstrap.php';
require_admin();
verify_csrf();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$first = validate_name_or_fail((string)($in['first_name'] ?? ''), 'Vorname');
$last  = validate_name_or_fail((string)($in['last_name'] ?? ''), 'Nachname');
$userid= validate_userid_or_fail((string)($in['userid'] ?? ''));
$email = validate_email_or_fail((string)($in['email'] ?? ''));
$pass  = validate_password_or_fail((string)($in['password'] ?? ''), 'Passwort erfüllt die Vorgaben nicht');
$dept = trim((string)($in['department'] ?? ''));
$role  = ((string)($in['role'] ?? 'user')) === 'admin' ? 'admin' : 'user';
$settings = load_app_settings();
$departments = $settings['departments'] ?? [];
if ($dept !== '' && !in_array($dept, $departments, true)) {
    json_err('Ungültige Abteilung', 422);
}

$users = load_users();
if (user_by_login($userid, $users) || user_by_login($email, $users)) json_err('UserID oder E-Mail bereits vergeben', 409);

$id  = bin2hex(random_bytes(8));
$now = now_iso();

$users[] = [
  'id' => $id,
  'first_name' => $first,
  'last_name' => $last,
  'userid' => $userid,
  'email' => $email,
  'role' => $role,
  'department' => $dept, 
  'locked' => false,
  'created_at' => $now,
  'updated_at' => $now,
  'last_login_at' => null,
  'password_hash' => password_hash($pass, PASSWORD_DEFAULT),
  'failed_login_attempts' => 0,
  'locked_until' => null
];

save_users($users);
auth_log('USER CREATE id=' . clean_log_fragment($id) . ' userid=' . clean_log_fragment($userid) . ' role=' . clean_log_fragment($role));
json_ok(['id' => $id], 201);
