<?php
declare(strict_types=1);
require __DIR__ . '/../_bootstrap.php';
require_admin();

$registrationDefaults = [
  'registration_mode' => 'approval',
  'departments' => [],
];

$listifyDefaults = [
  'theme' => 'light',
  'itemEditor_createdate_DateOnly' => 'true',
  'itemEditor_deadline_DateOnly' => 'true',
  'commentCategories' => [],
  'commentLimit' => 150,
  'lists_phase' => [],
];

$registration = array_replace($registrationDefaults, load_json_file(REGISTRATION_SETTINGS_FILE, $registrationDefaults));
$listify = array_replace($listifyDefaults, load_json_file(LISTIFY_DEFAULT_CONFIG_FILE, $listifyDefaults));

json_ok([
  'registration' => $registration,
  'listify' => $listify,
]);
