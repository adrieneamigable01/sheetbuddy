<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_config.php';

// 1. Capture payload (Handles both application/json and traditional jQuery POST data)
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    $data = $_POST;
}

$folderId   = isset($data['id']) ? intval($data['id']) : null;
$folderName = isset($data['folder_name']) ? trim($data['folder_name']) : null;
$email      = isset($data['email']) ? trim($data['email']) : null; // Captured from frontend context

// 2. Strict Boundary Validation
if (empty($folderId) || empty($folderName)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Missing parameter definitions. Folder rename aborted.'
    ]);
    exit;
}

try {
    // 3. DUPLICATE FOLDER NAME CHECK FOR THE SAME USER
    // Only runs if an email context is provided to scope tracking ownership rules
    if (!empty($email)) {
        // Query to check if the name is taken by another folder ID owned by the same email
        $checkStmt = $conn->prepare("SELECT id FROM user_folders WHERE folder_name = ? AND user_email = ? AND id != ?");
        $checkStmt->bind_param("ssi", $folderName, $email, $folderId);
        $checkStmt->execute();
        $checkStmt->store_result();
        
        if ($checkStmt->num_rows > 0) {
            echo json_encode([
                'success' => false,
                'status' => 'success',
                'message' => "You already have a folder named '" . htmlspecialchars($folderName) . "'. Please use a different name."
            ]);
            $checkStmt->close();
            exit;
        }
        $checkStmt->close();
    }

    // 4. Update the folder name table context directly if no duplicates are found
    $stmt = $conn->prepare("UPDATE user_folders SET folder_name = ? WHERE id = ?");
    $stmt->bind_param("si", $folderName, $folderId);
    $stmt->execute();

    if ($stmt->affected_rows >= 0) {
        echo json_encode([
            'success' => true,
            'status' => 'success',
            'message' => "Folder successfully renamed to '" . htmlspecialchars($folderName) . "'."
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Folder target record not found or could not be modified.'
        ]);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database Engine Error: ' . $e->getMessage()
    ]);
}
?>