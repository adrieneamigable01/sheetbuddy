<?php
// Set headers for JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust this for security if needed

require_once 'db_connection.php'; // Your MySQLi connection file

// Get email from query parameter (e.g., fetch_full_docs.php?email=user@example.com)
$email = isset($_GET['email']) ? $_GET['email'] : null;

if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'User email is required to fetch documents.']);
    exit;
}

try {
    /**
     * We JOIN the user_documents with user_folders.
     * We use LEFT JOIN so that documents without a folder_id still appear.
     */
    $sql = "SELECT 
                d.id, 
                d.display_name, 
                d.google_sheet_id, 
                d.category, 
                d.folder_id,
                f.folder_name
            FROM user_documents d
            LEFT JOIN user_folders f ON d.folder_id = f.id
            WHERE d.user_email = ?
            ORDER BY f.folder_name ASC, d.display_name ASC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    
    $result = $stmt->get_result();
    $sheets = [];

    while ($row = $result->fetch_assoc()) {
        $sheets[] = $row;
    }

    // Return the combined data as JSON
    echo json_encode($sheets);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database Query Failed: ' . $e->getMessage()]);
}

$stmt->close();
$conn->close();
?>