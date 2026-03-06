<?php
// /loptastic/api/users/set_password.php
require __DIR__ . '/../_bootstrap.php';
require_admin();
verify_csrf();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (string)($in['id'] ?? '');
$new = (string)($in['password'] ?? '');
if ($id==='' || $new==='') json_err('ID/Passwort fehlt', 422);

$users = load_users();
$found = false;
foreach ($users as &$u) {
  if ($u['id'] === $id) {
    $found = true;
    $u['password_hash'] = password_hash($new, PASSWORD_DEFAULT);
    $u['updated_at'] = now_iso();
    // Reset Fail-Counter bei explizitem PW-Reset
    $u['failed_login_attempts'] = 0;
    $u['locked_until'] = null;
    break;
  }
}
if (!$found) json_err('User nicht gefunden', 404);
save_users($users);
auth_log("USER SETPASS id=$id");
json_ok();
