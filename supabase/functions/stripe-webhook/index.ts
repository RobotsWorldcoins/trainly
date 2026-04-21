// ─────────────────────────────────────────────────────────────────────────────
// Trainly — Stripe Webhook Handler
// Supabase Edge Function
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err: any) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }
});

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const { session_id, participant_id, trainer_profile_id } = intent.metadata;
  if (!session_id || !participant_id) return;

  await supabase
    .from('payments')
    .update({
      status: 'captured',
      captured_at: new Date().toISOString(),
      stripe_charge_id: (intent.latest_charge as string) ?? null,
    })
    .eq('stripe_payment_intent_id', intent.id);

  await supabase
    .from('session_participants')
    .update({ status: 'confirmed' })
    .eq('id', participant_id);

  // Award XP for booking
  const { data: payment } = await supabase
    .from('payments')
    .select('payer_id')
    .eq('stripe_payment_intent_id', intent.id)
    .single();

  if (payment) {
    await supabase.from('xp_logs').insert({
      user_id: payment.payer_id,
      amount: 10,
      source: 'session_booked',
      reference_id: session_id,
      reference_type: 'session',
    });
  }
}

async function handlePaymentIntentFailed(intent: Stripe.PaymentIntent) {
  await supabase
    .from('payments')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', intent.id);

  const { data: payment } = await supabase
    .from('payments')
    .select('participant_id')
    .eq('stripe_payment_intent_id', intent.id)
    .single();

  if (payment) {
    await supabase
      .from('session_participants')
      .update({ status: 'cancelled' })
      .eq('id', payment.participant_id);
  }
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  const plan = getPlanFromPriceId(sub.items.data[0]?.price?.id ?? '');
  const status = mapStripeStatus(sub.status);

  await supabase.from('subscriptions').upsert({
    user_id: profile.user_id,
    plan,
    status,
    stripe_subscription_id: sub.id,
    stripe_price_id: sub.items.data[0]?.price?.id,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });

  // Update profile role for trainer plans
  if (plan === 'trainer' && status === 'active') {
    await supabase
      .from('profiles')
      .update({ role: 'trainer' })
      .eq('user_id', profile.user_id);
  } else if (plan === 'coach_pro' && status === 'active') {
    await supabase
      .from('profiles')
      .update({ role: 'coach_pro' })
      .eq('user_id', profile.user_id);
  }
}

async function handleSubscriptionCancelled(sub: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  // Renew user_plus extras on invoice paid
  const customerId = invoice.customer as string;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  const plan = getPlanFromPriceId(invoice.lines.data[0]?.price?.id ?? '');

  if (plan === 'user_plus') {
    const now = new Date();
    const groupExpiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const plusExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await supabase.from('profiles').update({
      role: 'user_plus',
      group_creation_expires_at: groupExpiry.toISOString(),
      user_plus_expires_at: plusExpiry.toISOString(),
    }).eq('user_id', profile.user_id);
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  await supabase
    .from('payouts')
    .update({
      status: 'paid',
      processed_at: new Date().toISOString(),
    })
    .eq('stripe_transfer_id', transfer.id);
}

function getPlanFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    [Deno.env.get('STRIPE_PRICE_USER_PLUS') ?? '']: 'user_plus',
    [Deno.env.get('STRIPE_PRICE_TRAINER') ?? '']: 'trainer',
    [Deno.env.get('STRIPE_PRICE_COACH_PRO') ?? '']: 'coach_pro',
  };
  return map[priceId] ?? 'unknown';
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  const map: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    trialing: 'trialing',
    paused: 'paused',
  };
  return map[status] ?? status;
}
