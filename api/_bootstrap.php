<?php
/**
 * Listify – Community Edition
 * Projektmanagement-Tool
 * Copyright (c) 2025 Sven Bosse
 *
 * Dieses Programm ist freie Software: Sie können es unter den Bedingungen
 * der GNU Affero General Public License, Version 3, wie von der
 * Free Software Foundation veröffentlicht, weitergeben und/oder ändern.
 *
 * Dieses Programm wird in der Hoffnung verteilt, dass es nützlich ist,
 * jedoch OHNE JEDE GEWÄHRLEISTUNG – sogar ohne die implizite Gewährleistung
 * der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK.
 * Weitere Details finden Sie in der GNU Affero General Public License.
 *
 * Sie sollten eine Kopie der GNU Affero General Public License zusammen mit
 * diesem Programm erhalten haben. Wenn nicht, siehe <https://www.gnu.org/licenses/>.
 *
 * Kommerzielle Lizenzen sind auf Anfrage erhältlich.
 * Kontakt: essob-git@outlook.com
 *
 * Hinweis:
 * - Externe Bibliotheken behalten ihre eigenen Lizenzen.
 */

// /listify/api/_bootstrap.php
declare(strict_types=1);

ini_set('session.use_strict_mode', '1');
session_start([
  'cookie_httponly' => true,
  'cookie_secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'cookie_samesite' => 'Lax',
  'use_strict_mode' => true,
]);

// Sicherheitsheader (CSP optional strenger einstellen, wenn keine Inline-Styles nötig)
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer-when-downgrade');
header('Permissions-Policy: geolocation=()');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");

// Inaktivitäts-Timeout (z.B. 8h)
$INACTIVE_LIMIT = 60*60*8;
if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > $INACTIVE_LIMIT)) {
  session_unset();
  session_destroy();
  session_start();
}
$_SESSION['LAST_ACTIVITY'] = time();

const USERS_FILE = __DIR__ . '/../data/users.json';
const AUTH_LOG   = __DIR__ . '/../data/auth.log';
const REGISTRATION_SETTINGS_FILE = __DIR__ . '/../data/settings.json';
const LISTIFY_DEFAULT_CONFIG_FILE = __DIR__ . '/../app/default_config.json';

function json_ok($data = [], int $code = 200) {
  http_response_code($code);
  echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
  exit;
}
function json_err(string $msg, int $code = 400) {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}

function load_users(): array {
  if (!file_exists(USERS_FILE)) return [];
  $raw = file_get_contents(USERS_FILE);
  $data = json_decode($raw ?: '[]', true);
  return is_array($data) ? $data : [];
}
function save_users(array $users): void {
  $fp = fopen(USERS_FILE, 'c+');
  if (!$fp) json_err('Kann users.json nicht öffnen', 500);
  flock($fp, LOCK_EX);
  ftruncate($fp, 0);
  fwrite($fp, json_encode($users, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  @chmod(USERS_FILE, 0600);
}

function user_by_login(string $login, array $users): ?array {
  foreach ($users as $u) {
    if (strcasecmp($u['userid'] ?? '', $login) === 0 || strcasecmp($u['email'] ?? '', $login) === 0) {
      return $u;
    }
  }
  return null;
}

function require_auth(): array {
  if (!isset($_SESSION['uid'])) json_err('Nicht eingeloggt', 401);
  $users = load_users();
  foreach ($users as $u) {
    if (($u['id'] ?? null) === $_SESSION['uid']) {
      if (!empty($u['locked'])) json_err('Account gesperrt', 403);
      return $u;
    }
  }
  session_destroy();
  json_err('Session ungültig', 401);
}
function require_admin(): array {
  $u = require_auth();
  if (($u['role'] ?? 'user') !== 'admin') json_err('Adminrechte erforderlich', 403);
  return $u;
}

function csrf_token(): string {
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
  return $_SESSION['csrf'];
}
function verify_csrf(): void {
  $hdr = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if (!$hdr || !hash_equals($_SESSION['csrf'] ?? '', $hdr)) json_err('CSRF ungültig', 419);
}

function now_iso(): string {
  //return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('c');
  return (new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin')))->format('c');
}
function client_ip(): string {
  return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}
function auth_log(string $line): void {
  @file_put_contents(AUTH_LOG, sprintf("[%s] %s %s\n", now_iso(), client_ip(), $line), FILE_APPEND|LOCK_EX);
  @chmod(AUTH_LOG, 0600);
}

/** Output-Escaping für serverseitige Seiten (user-admin.php etc.) */
function e(string $s): string {
  return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Brute-Force: einfache Rate Limits / Lockout */
function can_attempt_login(array $u): bool {
  $locked_until = isset($u['locked_until']) ? strtotime($u['locked_until']) : 0;
  return $locked_until <= time();
}
function on_failed_login(array &$u): void {
  $u['failed_login_attempts'] = (int)($u['failed_login_attempts'] ?? 0) + 1;
  // ab 6 Versuchen 5 Min sperren
  if ($u['failed_login_attempts'] >= 6) {
    $u['locked_until'] = date('c', time() + 5*60);
  }
}
function on_success_login(array &$u): void {
  $u['failed_login_attempts'] = 0;
  $u['locked_until'] = null;
  $u['last_login_at'] = now_iso();
}

function load_app_settings(): array {
  $file = REGISTRATION_SETTINGS_FILE;
  if (!file_exists($file)) return [];
  $raw = file_get_contents($file);
  $data = json_decode($raw ?: '{}', true);
  return is_array($data) ? $data : [];
}

function load_json_file(string $file, array $fallback = []): array {
  if (!file_exists($file)) return $fallback;
  $raw = file_get_contents($file);
  $data = json_decode($raw ?: '{}', true);
  return is_array($data) ? $data : $fallback;
}

function save_json_file(string $file, array $data): void {
  $dir = dirname($file);
  if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
    json_err('Konfigurationsordner konnte nicht erstellt werden', 500);
  }

  $fp = fopen($file, 'c+');
  if (!$fp) json_err('Konfigurationsdatei kann nicht geöffnet werden', 500);
  if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    json_err('Konfigurationsdatei kann nicht gesperrt werden', 500);
  }

  ftruncate($fp, 0);
  fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
}
