export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeKey || !webhookSecret) throw new Error('Stripe non configuré');

    const sig = event.headers['stripe-signature'];
    const body = event.body;

    const verifyRes = await fetch('https://api.stripe.com/v1/webhook_endpoints', {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });

    let eventPayload;
    try {
      eventPayload = JSON.parse(body);
    } catch {
      throw new Error('Invalid payload');
    }

    if (eventPayload.type === 'checkout.session.completed') {
      const session = eventPayload.data.object;
      const supabaseUrl = 'https://uvgyjhgdcczjfijsbpgq.supabase.co';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!serviceKey) throw new Error('Service role key not configured');

      const res = await fetch(`${supabaseUrl}/rest/v1/orders?payment_reference=eq.${session.id}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const orders = await res.json();
      const order = orders?.[0];

      if (order) {
        await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'paid' }),
        });
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error('Webhook error:', error);
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }
};