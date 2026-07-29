export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { artwork_id, user_id, user_email } = JSON.parse(event.body || '{}');
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error('Stripe non configuré');

    if (!artwork_id || !user_id) throw new Error('Paramètres manquants');

    const supabaseUrl = 'https://uvgyjhgdcczjfijsbpgq.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    const authHeader = event.headers.authorization || event.headers.Authorization || '';

    const artworkRes = await fetch(`${supabaseUrl}/rest/v1/artworks?select=*&id=eq.${artwork_id}`, {
      headers: { apikey: supabaseKey, Authorization: authHeader },
    });
    const artworks = await artworkRes.json();
    const artwork = artworks?.[0];
    if (!artwork) throw new Error('Œuvre introuvable');

    const origin = event.headers.origin || event.headers.referer?.replace(/\/+$/, '') || 'https://kivu-culture.netlify.app';

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${origin}/kivu-culture.html?checkout=success`);
    params.append('cancel_url', `${origin}/kivu-culture.html?checkout=cancel`);
    if (user_email) params.append('customer_email', user_email);
    params.append('metadata[artwork_id]', artwork.id);
    params.append('metadata[buyer_id]', user_id);
    params.append('line_items[0][price_data][currency]', (artwork.currency || 'USD').toLowerCase());
    params.append('line_items[0][price_data][product_data][name]', artwork.title);
    if (artwork.description) params.append('line_items[0][price_data][product_data][description]', artwork.description);
    if (artwork.image_path) params.append('line_items[0][price_data][product_data][images][0]', artwork.image_path);
    params.append('line_items[0][price_data][unit_amount]', String(artwork.price_cents));
    params.append('line_items[0][quantity]', '1');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) throw new Error(session.error?.message || 'Erreur Stripe');

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, session_id: session.id }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};