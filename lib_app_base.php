<?php
declare(strict_types=1);

function loptastic_base_path(): string {
  static $basePath = null;
  if ($basePath !== null) {
    return $basePath;
  }

  $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
  $dir = rtrim(dirname($scriptName), '/');
  if ($dir === '.' || $dir === '/') {
    $dir = '';
  }

  if (preg_match('#^(.*?)/api(?:/.*)?$#', $dir, $m)) {
    $dir = $m[1];
  }

  $basePath = $dir;
  return $basePath;
}

function loptastic_url(string $path = '/'): string {
  $base = loptastic_base_path();

  if ($path === '' || $path === '/') {
    return ($base !== '' ? $base : '') . '/';
  }

  return ($base !== '' ? $base : '') . '/' . ltrim($path, '/');
}
