<?php
declare(strict_types=1);
require __DIR__ . '/../_bootstrap.php';

$defaults = [
  'registration_mode' => 'approval',
  'departments' => [],
];

$registration = array_replace($defaults, load_json_file(REGISTRATION_SETTINGS_FILE, $defaults));
json_ok($registration);
