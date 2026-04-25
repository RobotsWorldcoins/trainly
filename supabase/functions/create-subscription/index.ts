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

// ─── Price ID map ──────────────────────────────────────────────────────────
// Create these prices in your Stripe Dashboard and add the IDs as edge function secrets:
//   STRIPE_PRICE_USER_PLUS_MONTHLY   — €4,99/month recurring
//   STRIPE_PRICE_USER_PLUS_ANNUAL    — €39,99/year one-time OR recurring
//   STRIPE_PRICE_TRAINER_MONTHLY     — €19/month recurring
//   STRIPE_PRICE_TRAINER_ANNUAL      — €159/year recurring
//   STRIPE_PRICE_COACH_PRO_MONTHLY   — €39/month recurring
//   STRIPE_PRICE_COACH_PRO_ANNUAL    — €319/year recurring
const PRICE_MAP: Record<string, string> = {
  price_user_plus_monthly:  Deno.env.get('STRIPE_PRICE_USER_PLUS_MONTHLY')  ?? '',
  price_user_plus_annual:   Deno.env.get('STRIPE_PRICE_USER_PLUS_ANNUAL')   ?? '',
  price_trainer_monthly:    Deno.env.get('STRIPE_PRICE_TRAINER_MONTHLY')    ?? '',
  price_trainer_annual:     Deno.env.get('STRIPE_PRICE_TRAINER_ANNUAL')     ?? '',
  price_coach_pro_monthly:  Deno.env.get('STRIPE_PRICE_COACH_PRO_MONTHLY')  ?? '',
  price_coach_pro_annual:   Deno.env.get('STRIPE_PRICE_COACH_PRO_ANNUAL')   ?? '',
};

// One-time amounts in cents (fallback if Stripe price ID not yet configured)
const ONE_TIME_AMOUNTS: Record<string, number> = {
  price_user_plus_monthly: 499,
  price_user_plus_annual:  3999,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // ── Payload ───────────────────────────────────────────────────────────
    const body = await req.json();
    const priceKey: string = body.priceKey ?? body.plan; // backwards-compatible
    const billing: 'monthly' | 'annual' = body.billing ?? 'monthly';

    if (!priceKey) {
      return new Response(JSON.stringify({ error: 'priceKey required' }), { status: 400, headers: corsHeaders });
    }

    // ── Customer ──────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.display_name ?? '',
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    const stripePriceId = PRICE_MAP[priceKey];
    const isUserPlus = priceKey.startsWith('price_user_plus');

    // ── User Plus: one-time payment ───────────────────────────────────────
    if (isUserPlus) {
      const amount = ONE_TIME_AMOUNTS[priceKey] ?? 499;
      const intent = await stripe.paymentIntents.create({
        amount,
        currency: 'eur',
        customer: customerId,
        description: `TrainyX User Plus — ${billing === 'annual' ? 'Anual' : 'Mensal'}`,
        metadata: { plan: 'user_plus', billing, user_id: user.id },
        automatic_payment_methods: { enabled: true },
      });

      return new Response(
        JSON.stringify({ clientSecret: intent.client_secret }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Trainer / Coach Pro: recurring subscription ───────────────────────
    if (!stripePriceId) {
      return new Response(
        JSON.stringify({ error: `Stripe price not configured for key: ${priceKey}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { priceKey, billing, user_id: user.id },
    });

    const invoice = subscription.latest_invoice as any;
    const clientSecret = invoice?.payment_intent?.client_secret;

    return new Response(
      JSON.stringify({ clientSecret, subscriptionId: subscription.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[create-subscription]', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
