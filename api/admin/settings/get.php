<?php
require __DIR__ . '/../../_bootstrap.php';

require_admin();

$key = trim((string)($_GET['section'] ?? ''));

if ($key !== '') {
  $section = get_settings_section($key);
  if ($section === null) json_err('Unbekannter Settings-Bereich', 404);
  json_ok(['section' => $section]);
}

$sections = [];
foreach (array_keys(settings_registry()) as $sectionKey) {
  $section = get_settings_section($sectionKey);
  if ($section !== null) {
    $sections[] = $section;
  }
}

json_ok(['sections' => $sections]);
