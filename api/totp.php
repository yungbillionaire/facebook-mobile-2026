<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');

function base32_decode($base32) {
    $base32 = strtoupper(preg_replace('/\s+/', '', $base32));
    $base32 = str_replace('=', '', $base32);
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    for ($i = 0; $i < strlen($base32); $i++) {
        $val = strpos($alphabet, $base32[$i]);
        if ($val === false) return '';
        $bits .= str_pad(decbin($val), 5, '0', STR_PAD_LEFT);
    }
    $bytes = '';
    for ($i = 0; $i + 8 <= strlen($bits); $i += 8) {
        $bytes .= chr(bindec(substr($bits, $i, 8)));
    }
    return $bytes;
}

function generateTOTP($secret) {
    $key = base32_decode($secret);
    if (empty($key)) return '------';
    $time = floor(time() / 30);
    $time = pack('N*', 0) . pack('N*', $time);
    $hmac = hash_hmac('sha1', $time, $key, true);
    $offset = ord($hmac[strlen($hmac)-1]) & 0x0F;
    $hashpart = substr($hmac, $offset, 4);
    $val = unpack('N', $hashpart)[1] & 0x7FFFFFFF;
    return str_pad($val % 1000000, 6, '0', STR_PAD_LEFT);
}

$secret = $_POST['secret'] ?? $_GET['secret'] ?? '';
if (strlen($secret) < 16) {
    echo json_encode(['error' => 'Secret too short']);
    exit;
}

echo json_encode(['totp' => generateTOTP($secret)]);