<?php
require __DIR__ . '/../../_bootstrap.php';

$section = get_settings_section('registration');
if ($section === null) json_err('Settings nicht gefunden', 404);

$data = $section['data'];
json_ok([
  'registration_mode' => $data['registration_mode'] ?? 'approval',
  'departments' => $data['departments'] ?? [],
]);
