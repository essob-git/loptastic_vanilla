<?php
// /listify/api/users/update.php
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

    $newUserid = array_key_exists('userid', $in) ? trim((string)$in['userid']) : (string)($u['userid'] ?? '');
    $newEmail = array_key_exists('email', $in) ? trim((string)$in['email']) : (string)($u['email'] ?? '');
    $newDept = array_key_exists('department', $in) ? trim((string)$in['department']) : (string)($u['department'] ?? '');

    foreach ($users as $other) {
      if (($other['id'] ?? '') === $id) continue;
      if (strcasecmp((string)($other['userid'] ?? ''), $newUserid) === 0 || strcasecmp((string)($other['email'] ?? ''), $newEmail) === 0) {
        json_err('UserID oder E-Mail bereits vergeben', 409);
      }
    }

    $settings = load_app_settings();
    $departments = $settings['departments'] ?? [];
    if ($newDept !== '' && !in_array($newDept, $departments, true)) {
      json_err('Ungültige Abteilung', 422);
    }

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
