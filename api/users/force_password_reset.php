<?php
// /loptastic/api/users/force_password_reset.php
require __DIR__ . '/../_bootstrap.php';
require_admin();
verify_csrf();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (string)($in['id'] ?? '');
if ($id === '') json_err('ID fehlt', 422);

$users = load_users();
$found = false;
foreach ($users as &$u) {
  if ($u['id'] === $id) {
    $found = true;
    $u['force_password_change'] = true;
    $u['updated_at'] = now_iso();
    break;
  }
}
if (!$found) json_err('User nicht gefunden', 404);

save_users($users);
auth_log("USER FORCEPW id=$id");
json_ok();
