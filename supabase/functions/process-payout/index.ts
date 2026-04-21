// ─────────────────────────────────────────────────────────────────────────────
// Trainly — Process Payouts Edge Function
// Called by cron after session attendance validation window closes
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
  // Verify internal call
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { session_id } = await req.json();

  try {
    const result = await processSessionPayouts(session_id);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Payout processing error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

async function processSessionPayouts(sessionId: string) {
  // Get session + trainer info
  const { data: session } = await supabase
    .from('sessions')
    .select(`
      id, title, trainer_id, status,
      trainer:profiles!trainer_id(stripe_connect_account_id, trainer_since)
    `)
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error('Session not found');
  if (session.status !== 'completed') throw new Error('Session not completed');

  const trainer = session.trainer as any;
  if (!trainer?.stripe_connect_account_id) throw new Error('Trainer has no Stripe Connect account');

  // Determine commission rate
  const trainerSince = trainer.trainer_since ? new Date(trainer.trainer_since) : null;
  const daysSinceSince = trainerSince
    ? Math.floor((Date.now() - trainerSince.getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const commissionRate = daysSinceSince <= 90 ? 0.05 : 0.10;

  // Get validated checkins for this session
  const { data: checkins } = await supabase
    .from('checkins')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('is_validated', true);

  const validatedUserIds = (checkins || []).map((c: any) => c.user_id);

  // Get payments for attended users
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'captured');

  if (!payments || payments.length === 0) {
    return { processed: 0, skipped: 0 };
  }

  let processed = 0;
  let skipped = 0;
  const results = [];

  for (const payment of payments as any[]) {
    // Check if user attended
    const attended = validatedUserIds.includes(payment.payer_id);

    if (attended) {
      // Release payment to trainer
      const trainerAmountCents = Math.floor(payment.amount_cents * (1 - commissionRate));

      try {
        const transfer = await stripe.transfers.create({
          amount: trainerAmountCents,
          currency: payment.currency,
          destination: trainer.stripe_connect_account_id,
          metadata: {
            session_id: sessionId,
            payment_id: payment.id,
            trainly_commission_rate: commissionRate.toString(),
          },
        });

        await supabase.from('payouts').insert({
          trainer_id: session.trainer_id,
          session_id: sessionId,
          payment_id: payment.id,
          amount_cents: trainerAmountCents,
          currency: payment.currency,
          stripe_transfer_id: transfer.id,
          status: 'paid',
          processed_at: new Date().toISOString(),
        });

        await supabase
          .from('payments')
          .update({ status: 'released', released_at: new Date().toISOString() })
          .eq('id', payment.id);

        await supabase
          .from('session_participants')
          .update({ status: 'attended' })
          .eq('session_id', sessionId)
          .eq('user_id', payment.payer_id);

        // Award attendance XP
        await supabase.from('xp_logs').insert({
          user_id: payment.payer_id,
          amount: 100,
          source: 'session_attended',
          reference_id: sessionId,
          reference_type: 'session',
        });

        processed++;
        results.push({ payment_id: payment.id, status: 'paid', transfer_id: transfer.id });
      } catch (err: any) {
        console.error(`Transfer failed for payment ${payment.id}:`, err);
        results.push({ payment_id: payment.id, status: 'failed', error: err.message });
      }
    } else {
      // No-show: trainer gets 50% of their share, user gets full refund of their full price
      // Per business rules: trainer receives 50% of reserved spot if trainer had valid check-in
      const trainerHadCheckin = await checkTrainerCheckin(sessionId, session.trainer_id);

      if (trainerHadCheckin) {
        const noShowTrainerAmount = Math.floor(payment.trainer_amount_cents * 0.5);

        // Partial payout to trainer
        if (noShowTrainerAmount > 0) {
          try {
            const transfer = await stripe.transfers.create({
              amount: noShowTrainerAmount,
              currency: payment.currency,
              destination: trainer.stripe_connect_account_id,
              metadata: {
                session_id: sessionId,
                payment_id: payment.id,
                reason: 'no_show_partial',
              },
            });

            await supabase.from('payouts').insert({
              trainer_id: session.trainer_id,
              session_id: sessionId,
              payment_id: payment.id,
              amount_cents: noShowTrainerAmount,
              currency: payment.currency,
              stripe_transfer_id: transfer.id,
              status: 'paid',
              processed_at: new Date().toISOString(),
            });
          } catch (err) {
            console.error('No-show partial payout failed:', err);
          }
        }

        // Refund remaining to user
        const refundAmount = payment.amount_cents - noShowTrainerAmount - payment.platform_fee_cents;
        if (refundAmount > 0 && payment.stripe_charge_id) {
          try {
            const refund = await stripe.refunds.create({
              charge: payment.stripe_charge_id,
              amount: refundAmount,
            });

            await supabase.from('refunds').insert({
              payment_id: payment.id,
              user_id: payment.payer_id,
              amount_cents: refundAmount,
              reason: 'user_no_show',
              stripe_refund_id: refund.id,
              status: 'processed',
              processed_at: new Date().toISOString(),
            });
          } catch (err) {
            console.error('No-show refund failed:', err);
          }
        }
      } else {
        // Trainer also no-showed: full refund
        if (payment.stripe_charge_id) {
          try {
            const refund = await stripe.refunds.create({
              charge: payment.stripe_charge_id,
              amount: payment.amount_cents,
              reason: 'fraudulent',
            });

            await supabase.from('refunds').insert({
              payment_id: payment.id,
              user_id: payment.payer_id,
              amount_cents: payment.amount_cents,
              reason: 'trainer_no_show',
              stripe_refund_id: refund.id,
              status: 'processed',
              processed_at: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Trainer no-show refund failed:', err);
          }
        }

        // Issue trainer strike
        await issueTrainerStrike(session.trainer_id, sessionId);
      }

      await supabase
        .from('session_participants')
        .update({ status: 'no_show' })
        .eq('session_id', sessionId)
        .eq('user_id', payment.payer_id);

      skipped++;
    }
  }

  // Mark session payments as fully processed
  await supabase
    .from('sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId);

  return { processed, skipped, results };
}

async function checkTrainerCheckin(sessionId: string, trainerProfileId: string): Promise<boolean> {
  const { data: trainer } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', trainerProfileId)
    .single();

  if (!trainer) return false;

  const { data: checkin } = await supabase
    .from('checkins')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', trainer.user_id)
    .eq('is_validated', true)
    .single();

  return !!checkin;
}

async function issueTrainerStrike(trainerProfileId: string, sessionId: string) {
  await supabase.from('admin_actions').insert({
    admin_id: '00000000-0000-0000-0000-000000000006', // system admin
    action_type: 'suspend_user',
    target_type: 'trainer',
    target_id: trainerProfileId,
    reason: `Auto-strike: trainer no-show for session ${sessionId}`,
    metadata: { auto: true, session_id: sessionId },
  });
}
