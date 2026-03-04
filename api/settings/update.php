<?php
declare(strict_types=1);
require __DIR__ . '/../_bootstrap.php';
verify_csrf();
require_admin();

$in = json_decode(file_get_contents('php://input'), true) ?? [];
$registration = $in['registration'] ?? null;
$listify = $in['listify'] ?? null;

if (!is_array($registration) || !is_array($listify)) {
  json_err('Ungültige Eingabedaten', 422);
}

$mode = (string)($registration['registration_mode'] ?? 'approval');
$allowedModes = ['closed', 'approval', 'open'];
if (!in_array($mode, $allowedModes, true)) {
  json_err('Ungültiger Registrierungsmodus', 422);
}

$departmentsInput = $registration['departments'] ?? [];
if (!is_array($departmentsInput)) {
  json_err('Abteilungen müssen als Liste übergeben werden', 422);
}
$departments = [];
foreach ($departmentsInput as $department) {
  $value = trim((string)$department);
  if ($value !== '') {
    $departments[] = $value;
  }
}

$commentCategoriesInput = $listify['commentCategories'] ?? [];
if (!is_array($commentCategoriesInput)) {
  json_err('Kommentarkategorien müssen als Liste übergeben werden', 422);
}
$commentCategories = [];
foreach ($commentCategoriesInput as $category) {
  $value = trim((string)$category);
  if ($value !== '') {
    $commentCategories[] = $value;
  }
}

$phaseInput = $listify['lists_phase'] ?? [];
if (!is_array($phaseInput)) {
  json_err('Projektphasen müssen als Objekt übergeben werden', 422);
}
$phases = [];
foreach ($phaseInput as $key => $value) {
  $phaseKey = trim((string)$key);
  $phaseValue = trim((string)$value);
  if ($phaseKey !== '' && $phaseValue !== '') {
    $phases[$phaseKey] = $phaseValue;
  }
}

$theme = trim((string)($listify['theme'] ?? 'light'));
if ($theme === '') {
  $theme = 'light';
}

$commentLimit = filter_var($listify['commentLimit'] ?? 150, FILTER_VALIDATE_INT);
if ($commentLimit === false || $commentLimit < 1 || $commentLimit > 5000) {
  json_err('commentLimit muss zwischen 1 und 5000 liegen', 422);
}

$createdateDateOnly = filter_var($listify['itemEditor_createdate_DateOnly'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
$deadlineDateOnly = filter_var($listify['itemEditor_deadline_DateOnly'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

$registrationToSave = [
  'registration_mode' => $mode,
  'departments' => array_values(array_unique($departments)),
];

$listifyToSave = [
  'theme' => $theme,
  'itemEditor_createdate_DateOnly' => $createdateDateOnly ? 'true' : 'false',
  'itemEditor_deadline_DateOnly' => $deadlineDateOnly ? 'true' : 'false',
  'commentCategories' => array_values(array_unique($commentCategories)),
  'commentLimit' => $commentLimit,
  'lists_phase' => $phases,
];

save_json_file(REGISTRATION_SETTINGS_FILE, $registrationToSave);
save_json_file(LISTIFY_DEFAULT_CONFIG_FILE, $listifyToSave);

json_ok([
  'registration' => $registrationToSave,
  'listify' => $listifyToSave,
]);
