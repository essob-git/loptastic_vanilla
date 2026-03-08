<?php
require __DIR__ . '/../../_bootstrap.php';

json_ok([
  'password_policy' => get_password_policy(),
]);
