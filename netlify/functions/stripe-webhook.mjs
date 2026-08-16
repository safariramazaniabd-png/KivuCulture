import { createHmac, timingSafeEqual } from 'node:crypto';

const WEBHOOK_TOLERANCE_SECONDS = 300;

function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) throw new Error('Missing stripe-signature header');

  const parts = sigHeader.split(',').map(p => p.trim());
  let timestamp = null;
  let signature = null;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signature = value;
  }

  if (!timestamp || !signature) throw new Error('Invalid signature format');

  const t = parseInt(timestamp, 10);
  if (Number.isNaN(t)) throw new Error('Invalid timestamp');
  if (Math.abs(Date.now() / 1000 - t) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new Error('Timestamp outside tolerance window');
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== providedBuf.length) throw new Error('Signature mismatch');

  if (!timingSafeEqual(expectedBuf, providedBuf)) throw new Error('Signature mismatch');
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('Stripe non configuré');

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

    verifyStripeSignature(rawBody, event.headers['stripe-signature'], webhookSecret);

    const eventPayload = JSON.parse(rawBody);

    if (eventPayload.type === 'checkout.session.completed') {
      const session = eventPayload.data.object;
      const supabaseUrl = process.env.SUPABASE_URL || 'https://uvgyjhgdcczjfijsbpgq.supabase.co';
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
      } else {
        console.warn('Webhook: no matching order for session', session.id);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error('Webhook error:', error);
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }
};
