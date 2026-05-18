<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_config.php';

// Capture raw data payloads stream
$data = json_decode(file_get_contents('php://input'), true);

$email = isset($data['email']) ? trim($data['email']) : null;
$name  = isset($data['name']) ? trim($data['name']) : null;
$sub   = isset($data['sub']) ? trim($data['sub']) : null;

// Edge boundary validation
if (empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing critical user identity mapping data context.']);
    exit;
}

// Automatically detect metadata parameters
$ipAddress = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'UNKNOWN';
$userAgent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'UNKNOWN';

// Check for Cloudflare or Proxy Forwarded IP definitions arrays if applicable
if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $ipArray = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $ipAddress = trim($ipArray[0]);
}

try {
    // Write access audit logs execution path via safe prepared statements mapping
    $stmt = $conn->prepare("INSERT INTO user_login_logs (user_email, user_name, google_sub_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $email, $name, $sub, $ipAddress, $userAgent);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Login instance audited successfully.'
    ]);
    
    $stmt->close();

} catch (Exception $e) {
    // Log failure codes internally but do not stall out runtime rendering responses
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Audit logging storage execution failure: ' . $e->getMessage()
    ]);
}
?>