// Cloudflare Pages Function - Telegram Bot Bridge
// This runs on Cloudflare's edge (FREE, 100k requests/day)

const TELEGRAM_BOT_TOKEN = '7763873416:AAHEIi3D7aL_Gg5MEPWfM_NY2Clz8iZcNZ4';
const HF_SPACE_URL = 'https://mdh-zone-openclow.hf.space/webhook';

export async function onRequest(context) {
    const url = new URL(context.request.url);
    
    // Handle Telegram webhook
    if (url.pathname === '/telegram') {
        return await handleTelegram(context.request);
    }
    
    // Handle health check
    if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'healthy', service: 'telegram-bridge' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // Handle set webhook
    if (url.pathname === '/set-webhook') {
        return await setWebhook();
    }
    
    return new Response('Telegram Bot Bridge Running\n\nEndpoints:\n- /telegram (webhook)\n- /health (status)\n- /set-webhook (configure)', { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    });
}

async function handleTelegram(request) {
    try {
        const update = await request.json();
        
        if (!update.message) {
            return new Response('OK', { status: 200 });
        }
        
        const chatId = update.message.chat.id;
        const text = update.message.text || '';
        const userId = update.message.from.id;
        
        console.log(`Message from ${userId}: ${text}`);
        
        // Forward to HF Spaces
        const hfResponse = await fetch(HF_SPACE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId,
                userId,
                text,
                timestamp: new Date().toISOString()
            })
        });
        
        const hfData = await hfResponse.json();
        
        // Send response back to Telegram
        if (hfData && hfData.response) {
            await sendMessage(chatId, hfData.response);
        }
        
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error:', error);
        return new Response('Error: ' + error.message, { status: 500 });
    }
}

async function sendMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        })
    });
}

async function setWebhook() {
    // Get your actual worker URL from Cloudflare dashboard
    const workerUrl = 'https://telegram-bot-bridge.YOUR-GITHUB-USERNAME.pages.dev/telegram';
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(workerUrl)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    });
}
