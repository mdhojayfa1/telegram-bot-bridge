export async function onRequest(context) {
    const TELEGRAM_BOT_TOKEN = '7763873416:AAHEIi3D7aL_Gg5MEPWfM_NY2Clz8iZcNZ4';
    const HF_SPACE_URL = 'https://mdh-zone-openclow.hf.space/webhook';
    
    try {
        const request = context.request;
        const update = await request.json();
        
        if (!update.message) {
            return new Response('OK', { status: 200 });
        }
        
        const chatId = update.message.chat.id;
        const text = update.message.text || '';
        
        console.log(`📩 Message from ${chatId}: ${text}`);
        
        // Forward to HF Spaces
        const hfResponse = await fetch(HF_SPACE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId,
                text,
                timestamp: new Date().toISOString()
            })
        });
        
        const hfData = await hfResponse.json();
        
        // Send response back to Telegram
        if (hfData && hfData.response) {
            const sendUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            await fetch(sendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: hfData.response,
                    parse_mode: 'Markdown'
                })
            });
        }
        
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('❌ Error:', error);
        return new Response('Error: ' + error.message, { status: 500 });
    }
}
