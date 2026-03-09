export async function onRequest(context) {
    const url = new URL(context.request.url);
    
    return new Response(`Telegram Bot Bridge is Running!

Your Worker URL: ${url.origin}

Endpoints:
- ${url.origin}/health (Health check)
- ${url.origin}/set-webhook (Set Telegram webhook)
- ${url.origin}/telegram (Telegram webhook)

Status: ✅ Active`, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    });
}
