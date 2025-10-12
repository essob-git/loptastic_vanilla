<?php
require __DIR__ . '/../_bootstrap.php';
require_admin();
verify_csrf();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (string)($in['id'] ?? '');
if ($id==='') json_err('ID fehlt', 422);

$users = load_users();
foreach ($users as &$u) {
  if ($u['id'] === $id) {
    $u['pending'] = false;
    $u['locked']  = false;
    $u['updated_at'] = now_iso();
    save_users($users);
    json_ok();
  }
}
json_err('User nicht gefunden', 404);
