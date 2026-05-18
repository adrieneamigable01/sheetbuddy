<?php
header('Content-Type: application/json');
require_once 'db_config.php'; // Ensure this contains your $conn variable

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['name']) || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing folder name or email']);
    exit;
}

$folderName = $data['name'];
$userEmail = $data['email'];

try {

     if (!empty($userEmail)) {
        // Query to check if the name is taken by another folder ID owned by the same email
        $checkStmt = $conn->prepare("SELECT id FROM user_folders WHERE folder_name = ? AND user_email = ?");
        $checkStmt->bind_param("ss", $folderName, $userEmail);
        $checkStmt->execute();
        $checkStmt->store_result();
        
        if ($checkStmt->num_rows > 0) {
            echo json_encode([
                'status' => 'error',
                'message' => "You already have a folder named '" . htmlspecialchars($folderName) . "'. Please use a different name."
            ]);
            $checkStmt->close();
            exit;
        }
        $checkStmt->close();
    }


    $stmt = $conn->prepare("INSERT INTO user_folders (user_email, folder_name) VALUES (?, ?)");
    $stmt->bind_param("ss", $userEmail, $folderName);
    
    if ($stmt->execute()) {
        echo json_encode([
            'status' => 'success',
            'folder_id' => $stmt->insert_id,
            'message' => 'Folder created successfully'
        ]);
    } else {
        throw new Exception($stmt->error);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>