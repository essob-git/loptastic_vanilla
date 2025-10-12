<?php
// /listify/index.php
declare(strict_types=1);
ini_set('session.use_strict_mode', '1');
session_start([
  'cookie_httponly' => true,
  'cookie_secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'cookie_samesite' => 'Lax',
  'use_strict_mode' => true,
]);
if (!isset($_SESSION['uid'])) {
  header('Location: /listify/login.php');
  exit;
}
readfile(__DIR__ . '/app/index.html');
