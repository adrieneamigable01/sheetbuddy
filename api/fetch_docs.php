<?php
// fetch_docs.php
header('Content-Type: application/json');
require_once 'docs_functions.php';

try {
    $sheetList = getAllSheetIds($conn);
    echo json_encode($sheetList);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>