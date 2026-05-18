<?php

header("Content-Type: application/json");

// ==========================
// GET JSON FROM JS
// ==========================
$input = json_decode(file_get_contents("php://input"), true);

if (!isset($input['rows'], $input['spreadsheetId'], $input['sheetName'])) {
    echo json_encode([
        "success" => false,
        "message" => "Missing required parameters"
    ]);
    exit;
}

// ==========================
// INPUTS
// ==========================
$rows = $input['rows'];
$spreadsheetId = trim($input['spreadsheetId']);
$sheetName = trim($input['sheetName']);

// ⚠️ IMPORTANT: Replace with VALID Google OAuth Access Token (ya29....)
$accessToken = getAccessToken("sheets-sync-495803-ab738abab909.json");


// ==========================
// CLEAN DATA (remove empty rows)
// ==========================
$clean = [];

foreach ($rows as $row) {
    if (array_filter($row)) {
        $clean[] = array_values($row);
    }
}


// ==========================
// SAFE RANGE (FIX FOR MALFORMED URL ERROR)
// ==========================
$range = "'" . $sheetName . "'!A1";
$encodedRange = rawurlencode($range);


// ==========================
// GOOGLE SHEETS API URL
// ==========================
$url = "https://sheets.googleapis.com/v4/spreadsheets/"
    . $spreadsheetId
    . "/values/"
    . rawurlencode($range)
    . "?valueInputOption=USER_ENTERED";


// ==========================
// PAYLOAD
// ==========================
$data = [
    "values" => $clean
];


// ==========================
// cURL REQUEST
// ==========================
$ch = curl_init($url);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");

curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $accessToken",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);


// ==========================
// RESPONSE HANDLING
// ==========================
if (curl_errno($ch)) {

    echo json_encode([
        "success" => false,
        "error" => curl_error($ch)
    ]);

} else {

    $decoded = json_decode($response, true);

    if ($httpCode >= 200 && $httpCode < 300) {

        echo json_encode([
            "success" => true,
            "message" => "Sheet updated successfully",
            "updatedCells" => $decoded
        ]);

    } else {

        echo json_encode([
            "success" => false,
            "http_code" => $httpCode,
            "response" => $decoded
        ]);

    }
}

curl_close($ch);



function getAccessToken($serviceAccountFile) {

    // Load service account JSON
    $jsonKey = json_decode(file_get_contents($serviceAccountFile), true);

    $clientEmail = $jsonKey['client_email'];
    $privateKey  = $jsonKey['private_key'];

    $tokenUrl = "https://oauth2.googleapis.com/token";

    $now = time();

    // JWT Header
    $header = [
        "alg" => "RS256",
        "typ" => "JWT"
    ];

    // JWT Claim Set
    $claimSet = [
        "iss"   => $clientEmail,
        "scope" => "https://www.googleapis.com/auth/spreadsheets",
        "aud"   => $tokenUrl,
        "iat"   => $now,
        "exp"   => $now + 3600
    ];

    // Base64Url encode helper
    function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    // Encode header & payload
    $jwtHeader  = base64UrlEncode(json_encode($header));
    $jwtPayload = base64UrlEncode(json_encode($claimSet));

    $unsignedJwt = $jwtHeader . "." . $jwtPayload;

    // Sign JWT using RSA SHA256
    openssl_sign($unsignedJwt, $signature, $privateKey, "SHA256");

    $jwt = $unsignedJwt . "." . base64UrlEncode($signature);

    // Request access token from Google
    $postData = http_build_query([
        "grant_type" => "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion"  => $jwt
    ]);

    $ch = curl_init($tokenUrl);

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/x-www-form-urlencoded"
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);

    return $result['access_token'] ?? null;
}