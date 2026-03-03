<?php
require __DIR__ . '/../../_bootstrap.php';

require_admin();
verify_csrf();

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) json_err('Ungültiger JSON-Body', 422);

$key = trim((string)($in['section'] ?? ''));
$payload = $in['data'] ?? null;

if ($key === '') json_err('section fehlt', 422);
if (!is_array($payload)) json_err('data muss ein Objekt sein', 422);

save_settings_section($key, $payload);

$section = get_settings_section($key);
if ($section === null) json_err('Unbekannter Settings-Bereich', 404);

json_ok(['section' => $section]);
