<?php
// /listify/api/users/delete.php
require __DIR__ . '/../_bootstrap.php';
require_admin();
verify_csrf();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (string)($in['id'] ?? '');
if ($id==='') json_err('ID fehlt', 422);

$users = load_users();
$new = array_values(array_filter($users, fn($u) => ($u['id'] ?? '') !== $id));
if (count($new) === count($users)) json_err('User nicht gefunden', 404);
save_users($new);
auth_log("USER DELETE id=$id");
json_ok();
