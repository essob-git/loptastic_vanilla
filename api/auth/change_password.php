<?php
require __DIR__ . '/../_bootstrap.php';
$user = require_auth();
verify_csrf();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$old = (string)($in['old_password'] ?? '');
$new = (string)($in['new_password'] ?? '');

if ($old==='' || $new==='') json_err('Felder fehlen', 422);

$users = load_users();
foreach ($users as &$u) {
  if ($u['id'] === $user['id']) {
    if (!password_verify($old, $u['password_hash'] ?? '')) json_err('Altes Passwort falsch', 401);
    $u['password_hash'] = password_hash($new, PASSWORD_DEFAULT);
    $u['updated_at'] = now_iso();
    save_users($users);
    auth_log("PASS CHANGE uid={$u['id']}");
    json_ok();
  }
}
json_err('User nicht gefunden', 404);
