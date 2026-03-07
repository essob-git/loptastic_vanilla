<?php
require __DIR__ . '/../../_bootstrap.php';

$botProtection = get_bot_protection_settings();
$botToken = null;

if (!empty($botProtection['enabled'])) {
  $botToken = bin2hex(random_bytes(16));
  $_SESSION['login_bot_token'] = $botToken;
  $_SESSION['login_bot_issued_at'] = time();
}

json_ok([
  'bot_protection' => $botProtection,
  'bot_token' => $botToken,
]);
