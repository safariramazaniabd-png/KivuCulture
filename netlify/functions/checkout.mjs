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
    const { artwork_id, user_id } = JSON.parse(event.body || '{}');
    if (!artwork_id || !user_id) throw new Error('Paramètres manquants');

    const origin = event.headers.origin || event.headers.referer?.replace(/\/+$/, '') || 'https://kivu-culture.netlify.app';
    const successUrl = `${origin}/kivu-culture.html?checkout=success&artwork=${artwork_id}`;
    const cancelUrl = `${origin}/kivu-culture.html?checkout=cancel`;

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: successUrl, cancel_url: cancelUrl }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
