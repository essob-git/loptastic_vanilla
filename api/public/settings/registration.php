<?php
require __DIR__ . '/../../_bootstrap.php';

$section = get_settings_section('registration');
if ($section === null) json_err('Settings nicht gefunden', 404);

$data = $section['data'];
$botProtection = get_bot_protection_settings();
$botToken = null;

if (!empty($botProtection['enabled'])) {
  $botToken = bin2hex(random_bytes(16));
  $_SESSION['register_bot_token'] = $botToken;
  $_SESSION['register_bot_issued_at'] = time();
}

json_ok([
  'registration_mode' => $data['registration_mode'] ?? 'approval',
  'departments' => $data['departments'] ?? [],
  'password_policy' => $data['password_policy'] ?? default_password_policy(),
  'bot_protection' => $botProtection,
  'bot_token' => $botToken,
]);
