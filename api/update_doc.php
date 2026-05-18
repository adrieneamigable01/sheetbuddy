<?php
header('Content-Type: application/json');
require_once 'docs_functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Read JSON input stream
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $id = $data['id'] ?? '';
    $name = $data['name'] ?? '';
    $sheet_id = $data['sheet_id'] ?? '';
    $source = $data['source'] ?? 'admin'; // For your admin-side updates

    if (!empty($id) && !empty($name) && !empty($sheet_id)) {
        
        // 2. CHECK FOR DUPLICATES
        // We look for any OTHER record (id != ?) that has the same sheet_id
        // AND is also an 'admin' source.
        $checkSql = "SELECT id FROM dashboard_docs 
                    WHERE google_sheet_id = ? 
                    AND id != ? 
                    AND source = ? 
                    LIMIT 1";
                    
        $checkStmt = $conn->prepare($checkSql);
        
        // CRITICAL: Changed "si" to "sis" 
        // s = sheet_id (string)
        // i = id (integer)
        // s = source (string)
        $checkStmt->bind_param("sis", $sheet_id, $id, $source);
        $checkStmt->execute();
        $result = $checkStmt->get_result();

        if ($result->num_rows > 0) {
            echo json_encode([
                'success' => false, 
                'message' => 'This Google Sheet ID is already used by another Global Admin document.'
            ]);
            exit;
        }

        // 3. PROCEED WITH UPDATE
        // We only update display_name and google_sheet_id. 
        // Admin updates shouldn't change the user_email or source usually.
        $stmt = $conn->prepare("UPDATE dashboard_docs SET display_name = ?, google_sheet_id = ? WHERE id = ?");
        $stmt->bind_param("ssi", $name, $sheet_id, $id);
        $success = $stmt->execute();
        
        echo json_encode([
            'success' => $success,
            'message' => $success ? "Global document updated successfully." : "Database update failed."
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Missing required fields for update.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
}
exit;