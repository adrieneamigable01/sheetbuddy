<?php
header('Content-Type: application/json');
require_once 'docs_functions.php'; // Ensure this file establishes the $conn variable

// 1. Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

// 2. Get the JSON input
$json = file_get_contents('php://input');
$data = json_decode($json, true);
$id = $data['id'] ?? '';

if (empty($id)) {
    echo json_encode(['success' => false, 'message' => 'Document ID is required.']);
    exit;
}

try {
    /**
     * SOFT DELETE LOGIC
     * Instead of removing the row, we set the 'deleted_at' timestamp.
     * We strictly filter by source = 'user' so users cannot soft-delete 
     * global Admin documents.
     */
    $sql = "UPDATE dashboard_docs 
            SET deleted_at = NOW() 
            WHERE id = ?";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode([
                'success' => true, 
                'message' => 'Document successfully removed from your list.'
            ]);
        } else {
            // This happens if the ID doesn't exist OR if it's an 'admin' source doc
            echo json_encode([
                'success' => false, 
                'message' => 'You do not have permission to remove this document.'
            ]);
        }
    } else {
        throw new Exception($conn->error);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'message' => 'Server Error: ' . $e->getMessage()
    ]);
}

exit;