<?php
require __DIR__ . '/../../_bootstrap.php';

$section = get_settings_section('loptastic_defaults');
if ($section === null) json_err('Settings nicht gefunden', 404);

json_ok($section['data']);
