<?php
header('Content-Type: application/json');
require_once 'db_config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['updates']) || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data provided']);
    exit;
}

$email = $data['email'];
$updates = $data['updates']; // Array of { doc_id, folder_id }

try {
    // Start transaction to ensure all updates happen together
    $conn->begin_transaction();

    $stmt = $conn->prepare("UPDATE user_documents SET folder_id = ? WHERE id = ? AND user_email = ?");

    foreach ($updates as $update) {
        $docId = $update['doc_id'];
        
        // Handle 'null' string from JS or empty values
        $folderId = ($update['folder_id'] === "null" || empty($update['folder_id'])) ? null : $update['folder_id'];
        
        // Use "i" for folderId (can be null), "i" for docId, "s" for email
        $stmt->bind_param("iis", $folderId, $docId, $email);
        $stmt->execute();
    }

    $conn->commit();
    echo json_encode(['status' => 'success', 'message' => 'Arrangement saved']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>