<?php
require __DIR__ . '/../_bootstrap.php';

if (!isset($_SESSION['uid'])) {
  json_ok(['authenticated' => false, 'csrf' => csrf_token()]);
}
$users = load_users();
foreach ($users as $u) {
  if (($u['id'] ?? null) === $_SESSION['uid']) {
    if (!empty($u['locked'])) json_err('Account gesperrt', 403);
    json_ok([
      'authenticated' => true,
      'csrf' => csrf_token(),
      'user' => [
        'id' => $u['id'],
        'userid' => $u['userid'],
        'email' => $u['email'],
        'first_name' => $u['first_name'],
        'last_name' => $u['last_name'],
        'department' => $u['department'] ?? null,
        'role' => $u['role'] ?? 'user',
        'last_login_at' => $u['last_login_at'] ?? null,
        'created_at' => $u['created_at'] ?? null
      ]
    ]);
  }
}
json_ok(['authenticated' => false, 'csrf' => csrf_token()]);
