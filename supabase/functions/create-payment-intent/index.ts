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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { sessionId, participantId, amountCents, currency, trainerName, sessionTitle } = await req.json();

    if (!sessionId || !participantId || !amountCents || !currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    // Fetch session to get trainer info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, trainer_id, trainer:profiles!trainer_id(stripe_connect_account_id, stripe_connect_onboarded, trainer_since)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: corsHeaders });
    }

    const trainer = session.trainer as any;

    if (!trainer?.stripe_connect_onboarded || !trainer?.stripe_connect_account_id) {
      return new Response(JSON.stringify({ error: 'Trainer payment account not configured' }), { status: 422, headers: corsHeaders });
    }

    // Determine commission rate
    const trainerSince = trainer.trainer_since ? new Date(trainer.trainer_since) : null;
    const earlyThreshold = trainerSince ? new Date(trainerSince.getTime() + 90 * 86400000) : null;
    const isEarlyTrainer = earlyThreshold && new Date() < earlyThreshold;
    const commissionRate = isEarlyTrainer ? 0.05 : 0.10;

    const platformFee = Math.round(amountCents * commissionRate);
    const trainerAmount = amountCents - platformFee;

    // Get or create Stripe customer (profiles use user_id FK)
    let stripeCustomerId: string | undefined;
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (profile?.stripe_customer_id) {
      stripeCustomerId = profile.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customer.id }).eq('user_id', user.id);
    }

    // Create PaymentIntent with Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      description: `${sessionTitle} — ${trainerName}`,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: trainer.stripe_connect_account_id,
      },
      metadata: {
        session_id: sessionId,
        participant_id: participantId,
        trainer_id: session.trainer_id,
        user_id: user.id,
        trainer_amount: String(trainerAmount),
        platform_fee: String(platformFee),
      },
    });

    // Record payment in DB
    await supabase.from('payments').insert({
      session_id: sessionId,
      participant_id: participantId,
      payer_id: user.id,
      trainer_id: session.trainer_id,
      amount: amountCents,
      trainer_amount: trainerAmount,
      platform_fee: platformFee,
      currency: currency.toLowerCase(),
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('create-payment-intent error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
