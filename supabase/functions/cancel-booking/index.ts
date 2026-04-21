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

function getRefundAmount(paymentAmount: number, sessionDate: string, sessionStartTime: string): number {
  const sessionDateTime = new Date(`${sessionDate}T${sessionStartTime}`);
  const hoursUntil = (sessionDateTime.getTime() - Date.now()) / 3600000;

  if (hoursUntil > 12) return paymentAmount; // 100% refund
  if (hoursUntil > 2) return Math.round(paymentAmount * 0.5); // 50% refund
  return 0; // no refund
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { sessionId, reason } = await req.json();
    if (!sessionId) return new Response(JSON.stringify({ error: 'sessionId required' }), { status: 400, headers: corsHeaders });

    // Find participant record
    const { data: participant, error: pError } = await supabase
      .from('session_participants')
      .select('id, status, session_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (pError || !participant) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: corsHeaders });
    }

    if (participant.status === 'cancelled') {
      return new Response(JSON.stringify({ error: 'Already cancelled' }), { status: 409, headers: corsHeaders });
    }

    // Fetch session details for timing
    const { data: session, error: sError } = await supabase
      .from('sessions')
      .select('date, start_time, status')
      .eq('id', sessionId)
      .single();

    if (sError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: corsHeaders });
    }

    if (session.status === 'cancelled' || session.status === 'completed') {
      return new Response(JSON.stringify({ error: 'Session already ended or cancelled' }), { status: 409, headers: corsHeaders });
    }

    // Find payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('id, amount, stripe_payment_intent_id, status')
      .eq('participant_id', participant.id)
      .eq('status', 'completed')
      .maybeSingle();

    let refundAmount = 0;
    let stripeRefundId: string | undefined;

    if (payment?.stripe_payment_intent_id) {
      refundAmount = getRefundAmount(payment.amount, session.date, session.start_time);

      if (refundAmount > 0) {
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
          amount: refundAmount,
          reason: 'requested_by_customer',
        });
        stripeRefundId = refund.id;

        // Record refund
        await supabase.from('refunds').insert({
          payment_id: payment.id,
          session_id: sessionId,
          user_id: user.id,
          amount: refundAmount,
          reason: reason || 'user_cancelled',
          stripe_refund_id: stripeRefundId,
          status: 'completed',
        });

        await supabase.from('payments').update({ status: refundAmount === payment.amount ? 'refunded' : 'partial_refund' }).eq('id', payment.id);
      }
    }

    // Cancel participant record
    await supabase
      .from('session_participants')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', participant.id);

    const hoursUntil = (new Date(`${session.date}T${session.start_time}`).getTime() - Date.now()) / 3600000;
    let refundPct = 0;
    if (hoursUntil > 12) refundPct = 100;
    else if (hoursUntil > 2) refundPct = 50;

    return new Response(
      JSON.stringify({
        success: true,
        refundAmount,
        refundPercent: refundPct,
        stripeRefundId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('cancel-booking error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
