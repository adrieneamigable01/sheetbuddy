<?php
header('Content-Type: application/json');
require_once 'db_config.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['updates']) || !isset($data['email'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid data provided.']);
    exit;
}

$updates = $data['updates'];
$email = $data['email'];

try {
    $conn->begin_transaction();

    // The SQL Logic: Try to insert everything. 
    // If (user_email + google_sheet_id) exists, just update the folder_id.
    $sql = "INSERT INTO user_documents (user_email, display_name, google_sheet_id, folder_id) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                folder_id = VALUES(folder_id),
                display_name = VALUES(display_name)";

    $stmt = $conn->prepare($sql);

    foreach ($updates as $update) {
        $name = $update['display_name'];
        $gsid = $update['google_sheet_id'];
        // Ensure folder_id is NULL or an Integer
        $fId  = ($update['folder_id'] === 'null' || $update['folder_id'] === null || $update['folder_id'] === '') 
                ? null 
                : (int)$update['folder_id'];

        // Bind parameters: s=string, i=integer
        $stmt->bind_param("sssi", $email, $name, $gsid, $fId);
        $stmt->execute();
    }

    $conn->commit();
    echo json_encode(['status' => 'success', 'message' => 'Arrangement synchronized.']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>