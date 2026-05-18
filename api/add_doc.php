<?php
header('Content-Type: application/json');
require_once 'docs_functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    
    $name = $input['name'] ?? '';
    $sheet_id = $input['sheet_id'] ?? '';
    $email = $input['email'] ?? '';
    $source = $input['source'] ?? '';

    if (empty($name) || empty($sheet_id)) {
        echo json_encode(['success' => false, 'message' => 'Missing fields.']);
        exit;
    }

    // logic for add_doc.php

    // 1. First, check if this is ALREADY an admin document (Global check)
    $adminCheck = $conn->prepare("SELECT id FROM dashboard_docs WHERE google_sheet_id = ? AND source = 'admin' LIMIT 1");
    $adminCheck->bind_param("s", $sheet_id);
    $adminCheck->execute();
    if ($adminCheck->get_result()->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'This is a system-wide document already.']);
        exit;
    }

    // 2. Then check if THIS specific user has already added it
    $userCheck = $conn->prepare("SELECT id FROM dashboard_docs WHERE google_sheet_id = ? AND user_email = ? LIMIT 1");
    $userCheck->bind_param("ss", $sheet_id, $email);
    $userCheck->execute();
    if ($userCheck->get_result()->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'You have already linked this document.']);
        exit;
    }

    // 2. If it doesn't exist in Admin and you haven't added it, proceed.
    $source = !empty($source) ? $source : 'user';
    $stmt = $conn->prepare("INSERT INTO dashboard_docs (display_name, google_sheet_id, user_email, source) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $name, $sheet_id, $email, $source);
    $success = $stmt->execute();
    
    echo json_encode([
        'success' => $success,
        'message' => $success ? "Document linked successfully." : "Database error."
    ]);
}