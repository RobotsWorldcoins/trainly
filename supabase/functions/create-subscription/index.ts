import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map plan keys to Stripe Price IDs (set in Stripe dashboard, reference via env)
const PRICE_IDS: Record<string, string> = {
  user_plus: Deno.env.get('STRIPE_PRICE_USER_PLUS') || '',
  trainer: Deno.env.get('STRIPE_PRICE_TRAINER') || '',
  coach_pro: Deno.env.get('STRIPE_PRICE_COACH_PRO') || '',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { plan } = await req.json();
    if (!plan || !PRICE_IDS[plan]) {
      return new Response(JSON.stringify({ error: `Unknown plan: ${plan}` }), { status: 400, headers: corsHeaders });
    }

    // Get/create Stripe customer (profiles use user_id FK, not id = auth user id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.display_name,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('user_id', user.id);
    }

    const priceId = PRICE_IDS[plan];

    // User Plus is a one-time payment, not a subscription
    if (plan === 'user_plus') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 499, // €4.99
        currency: 'eur',
        customer: customerId,
        description: 'Trainly User Plus — 365 days',
        metadata: {
          plan: 'user_plus',
          user_id: user.id,
        },
        automatic_payment_methods: { enabled: true },
      });

      return new Response(
        JSON.stringify({ clientSecret: paymentIntent.client_secret }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trainer / Coach Pro: recurring subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { plan, user_id: user.id },
    });

    const invoice = subscription.latest_invoice as any;
    const clientSecret = invoice?.payment_intent?.client_secret;

    return new Response(
      JSON.stringify({ clientSecret, subscriptionId: subscription.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('create-subscription error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
