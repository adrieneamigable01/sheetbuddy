<?php
// docs_functions.php
require_once 'db_config.php';

/**
 * Fetch all Google Sheet IDs from the database
 */
function getAllSheetIds($conn) {
    $sheets = [];
    $sql = "SELECT google_sheet_id FROM dashboard_docs WHERE source = 'admin' 
    OR user_email = 'user@example.com' AND deleted_at IS NULL ORDER BY created_at DESC";
    $result = $conn->query($sql);
    
    while ($row = $result->fetch_assoc()) {
        $sheets[] = $row['google_sheet_id'];
    }
    return $sheets;
}


function getFullDocList($conn) {
    $email = $_GET['email'] ?? ''; 

    // Added m.source and m.user_email to the SELECT
    $sql = "SELECT 
            m.id, 
            m.display_name, 
            m.google_sheet_id, 
            m.source,
            m.user_email,
            u.folder_id,
            f.folder_name
        FROM dashboard_docs m
        LEFT JOIN user_documents u ON m.google_sheet_id = u.google_sheet_id AND u.user_email = ?
        LEFT JOIN user_folders f ON u.folder_id = f.id
        -- This logic ensures we get ALL Admin docs PLUS this user's private docs
        WHERE m.source = 'admin' AND m.deleted_at IS NULL OR m.user_email = ? AND m.deleted_at IS NULL
        ORDER BY f.folder_name ASC, m.display_name ASC";

    $stmt = $conn->prepare($sql);
    // Bind email twice: once for the JOIN, once for the WHERE clause
    $stmt->bind_param("ss", $email, $email);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    return $data;
}

/**
 * Add a new Google Sheet to the management list
 */
function addSheet($conn, $sheetId, $displayName, $category = 'General') {
    $stmt = $conn->prepare("INSERT INTO dashboard_docs (google_sheet_id, display_name, category) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $sheetId, $displayName, $category);
    return $stmt->execute();
}

/**
 * Delete a sheet by its database ID
 */
function deleteSheet($conn, $id) {
    $stmt = $conn->prepare("DELETE FROM dashboard_docs WHERE id = ?");
    $stmt->bind_param("i", $id);
    return $stmt->execute();
}
?>