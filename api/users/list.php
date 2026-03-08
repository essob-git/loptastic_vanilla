<?php
// /loptastic/api/users/list.php
require __DIR__ . '/../_bootstrap.php';
require_admin();

$users = load_users();
foreach ($users as &$u) {
  $u['pending'] = $u['pending'] ?? false;
  $u['force_password_change'] = $u['force_password_change'] ?? false;
  unset($u['password_hash'], $u['failed_login_attempts'], $u['locked_until']);
}
json_ok(['users' => $users]);
