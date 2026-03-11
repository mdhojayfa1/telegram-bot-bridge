// C.C. Green - Telegram Bridge
// Cloudflare Worker - Handles Telegram ↔ HF Spaces communication
// FREE: 100,000 requests/day, no credit card

const HF_SPACE_URL = 'https://mdh-zone-openclow.hf.space/webhook';
const TELEGRAM_BOT_TOKEN = '7763873416:AAHEIi3D7aL_Gg5MEPWfM_NY2Clz8iZcNZ4';

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
            service: 'cc-green-bridge',
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Handle set webhook
    if (url.pathname === '/set-webhook') {
        return await setWebhook(context.request);
    }
    
    // Home page
    return new Response(`🟢 C.C. Green Bridge is Active

Status: ✅ Operational
Uptime: ${Math.floor(process.uptime())}s

Endpoints:
• ${url.origin}/telegram - Telegram webhook
• ${url.origin}/health - Health check  
• ${url.origin}/set-webhook - Configure webhook

Bot: @MDH_beta_bot
Powered by: Hugging Face Spaces + Cloudflare Workers`, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    });
}

async function handleTelegram(request) {
    try {        const update = await request.json();
        
        // Handle different update types
        if (update.message) {
            return await handleMessage(update.message);
        }
        else if (update.callback_query) {
            return await handleCallback(update.callback_query);
        }
        else if (update.inline_query) {
            return await handleInlineQuery(update.inline_query);
        }
        
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('❌ Telegram handler error:', error);
        return new Response('Error: ' + error.message, { status: 500 });
    }
}

async function handleMessage(message) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || 'User';
    const text = message.text || '';
    const chatType = message.chat.type;
    
    console.log(`📩 [${chatType}] @${username} (${userId}): ${text}`);
    
    // Send typing indicator
    await sendChatAction(chatId, 'typing');
    
    // Forward to HF Spaces for processing
    const hfResponse = await fetch(HF_SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId,
            userId,
            username,
            text,
            chatType,
            timestamp: new Date().toISOString(),
            messageId: message.message_id
        })
    });
    
    const hfData = await hfResponse.json();
    const response = hfData.response || 'Processing...';
        // Send response via Cloudflare (HF can't call Telegram directly)
    await sendTelegramMessage(chatId, response, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    });
    
    console.log(`✅ Response sent to ${chatId}`);
    return new Response('OK', { status: 200 });
}

async function handleCallback(callback) {
    const chatId = callback.message.chat.id;
    const data = callback.data;
    
    console.log(`🔘 Callback: ${data}`);
    
    // Process callback (inline buttons, etc.)
    const hfResponse = await fetch(HF_SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId,
            callback: true,
            data: data,
            timestamp: new Date().toISOString()
        })
    });
    
    const hfData = await hfResponse.json();
    
    if (hfData.response) {
        await editMessageText(chatId, callback.message.message_id, hfData.response);
    }
    
    await answerCallbackQuery(callback.id);
    return new Response('OK', { status: 200 });
}

async function handleInlineQuery(inlineQuery) {
    const query = inlineQuery.query;
    const from = inlineQuery.from;
    
    console.log(`🔍 Inline query from @${from.username}: ${query}`);
    
    // Process inline query
    const hfResponse = await fetch(HF_SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            inline: true,            query: query,
            userId: from.id,
            username: from.username,
            timestamp: new Date().toISOString()
        })
    });
    
    const results = await hfResponse.json();
    
    // Answer inline query
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerInlineQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            inline_query_id: inlineQuery.id,
            results: results.results || [],
            cache_time: 300
        })
    });
    
    return new Response('OK', { status: 200 });
}

// Telegram API helpers
async function sendTelegramMessage(chatId, text, options = {}) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: options.parse_mode || 'Markdown',
                disable_web_page_preview: options.disable_web_page_preview || false,
                disable_notification: options.disable_notification || false
            })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Send message error:', error);
        return { ok: false, error: error.message };
    }
}

async function sendChatAction(chatId, action) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`;
    
    try {        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, action: action })
        });
    } catch (e) {
        // Ignore action errors
    }
}

async function editMessageText(chatId, messageId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: text,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.error('Edit message error:', e);
    }
}

async function answerCallbackQuery(callbackQueryId, text = '') {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: text,
                show_alert: false
            })
        });
    } catch (e) {
        // Ignore
    }
}

async function setWebhook(request) {
    const url = new URL(request.url);
    const workerUrl = `${url.origin}/telegram`;    
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(workerUrl)}&allowed_updates=${encodeURIComponent(JSON.stringify(['message', 'callback_query', 'inline_query']))}`;
    
    try {
        const response = await fetch(telegramUrl);
        const data = await response.json();
        
        return new Response(JSON.stringify({
            ...data,
            workerUrl: workerUrl,
            note: data.ok ? '✅ Webhook configured! C.C. Green is ready.' : '❌ Failed to set webhook'
        }, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
            }
