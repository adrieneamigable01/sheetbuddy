<?php
// db_config.php
$isLive = true;

$host = 'localhost';
$user = 'root';
$pass = '';
$db   = 'db_docsmanagement';

if(!$isLive){
    $host = 'localhost';
    $user = 'u859692781_sheetbuddy';
    $pass = 'sh33tBuddy051826';
    $db   = 'u859692781_sheetbuddy';
}

// Enable error reporting for MySQLi
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli($host, $user, $pass, $db);
    $conn->set_charset("utf8mb4");
} catch (Exception $e) {
    error_log($e->getMessage());
    exit('Error connecting to database');
}
?>