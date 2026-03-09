export async function onRequest(context) {
    const TELEGRAM_BOT_TOKEN = '7763873416:AAHEIi3D7aL_Gg5MEPWfM_NY2Clz8iZcNZ4';
    
    const url = new URL(context.request.url);
    const workerUrl = `${url.origin}/telegram`;
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(workerUrl)}`;
    
    try {
        const response = await fetch(telegramUrl);
        const data = await response.json();
        
        return new Response(JSON.stringify({
            ...data,
            workerUrl: workerUrl,
            note: data.ok ? '✅ Webhook set successfully!' : '❌ Failed'
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
