// Cloudflare Pages Function - Telegram Bot Bridge

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
        return new Response(JSON.stringify({ 
            status: 'healthy', 
            service: 'telegram-bridge',
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // Handle set webhook
    if (url.pathname === '/set-webhook') {
        return await setWebhook(context.request);
    }
    
    return new Response('Telegram Bot Bridge Running', { status: 200 });
}

async function handleTelegram(request) {
    try {
        const update = await request.json();
        if (!update.message) return new Response('OK', { status: 200 });
        
        const chatId = update.message.chat.id;
        const text = update.message.text || '';
        
        const hfResponse = await fetch(HF_SPACE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, text, timestamp: new Date().toISOString() })
        });
        
        const hfData = await hfResponse.json();
        if (hfData && hfData.response) {
            await sendMessage(chatId, hfData.response);
        }
        
        return new Response('OK', { status: 200 });
    } catch (error) {
        return new Response('Error: ' + error.message, { status: 500 });
    }
}

async function sendMessage(chatId, text) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
}

async function setWebhook(request) {
    const url = new URL(request.request.url);
    const workerUrl = `${url.origin}/telegram`;
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(workerUrl)}`;
    
    const response = await fetch(telegramUrl);
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    });
}
