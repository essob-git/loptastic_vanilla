<?php
require __DIR__ . '/../_bootstrap.php';
if (isset($_SESSION['uid'])) auth_log("LOGOUT uid={$_SESSION['uid']}");
session_destroy();
json_ok();
