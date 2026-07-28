import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { artwork_id } = await req.json()

    const { data: artwork, error: artworkError } = await supabaseClient
      .from('artworks')
      .select('*')
      .eq('id', artwork_id)
      .single()

    if (artworkError || !artwork) {
      throw new Error('Œuvre introuvable')
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Non authentifié')
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: (artwork.currency || 'USD').toLowerCase(),
          product_data: {
            name: artwork.title,
            description: artwork.description || undefined,
            images: artwork.image_path ? [artwork.image_path] : [],
          },
          unit_amount: artwork.price_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin') || 'https://kivu-culture.netlify.app'}/kivu-culture.html?checkout=success`,
      cancel_url: `${req.headers.get('origin') || 'https://kivu-culture.netlify.app'}/kivu-culture.html?checkout=cancel`,
      customer_email: user.email,
      metadata: {
        artwork_id: artwork.id,
        buyer_id: user.id,
      },
    })

    await supabaseClient.from('orders').insert({
      buyer_id: user.id,
      artwork_id: artwork.id,
      amount_cents: artwork.price_cents,
      currency: artwork.currency || 'USD',
      status: 'pending',
      payment_reference: session.id,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})