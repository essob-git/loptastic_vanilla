<?php
// /loptastic/api/users/update.php
require __DIR__ . '/../_bootstrap.php';
require_admin();
verify_csrf();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (string)($in['id'] ?? '');
if ($id==='') json_err('ID fehlt', 422);

$users = load_users();
$found = false;
foreach ($users as &$u) {
  if ($u['id'] === $id) {
    $found = true;
    foreach (['first_name','last_name','userid','email','role','locked', 'department'] as $k) {
      if (array_key_exists($k, $in)) {
        if ($k==='role' && !in_array($in[$k], ['user','admin'], true)) continue;
        $u[$k] = $in[$k];
      }
    }
    $u['updated_at'] = now_iso();
    break;
  }
}
if (!$found) json_err('User nicht gefunden', 404);
save_users($users);
auth_log("USER UPDATE id=$id");
json_ok();
