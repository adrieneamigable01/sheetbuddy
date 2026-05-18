<?php
// api/fetch_folders.php
header('Content-Type: application/json');
require_once 'db_config.php'; // Your connection file

$email = $_GET['email'];

$stmt = $conn->prepare("SELECT id, folder_name FROM user_folders WHERE user_email = ? ORDER BY folder_name ASC");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

$folders = [];
while ($row = $result->fetch_assoc()) {
    $folders[] = $row;
}
echo json_encode($folders);
?>