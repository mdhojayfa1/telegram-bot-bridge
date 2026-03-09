export async function onRequest(context) {
    return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'telegram-bridge',
        timestamp: new Date().toISOString()
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
