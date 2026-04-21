import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

async function getAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: () => undefined } }
  );
}

async function verifyAdmin(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = await getAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return null;
  return user;
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { disputeId, sessionId, resolution, notes } = await req.json();
  if (!disputeId || !resolution) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const supabase = await getAdminClient();

  // Fetch dispute & payment info
  const { data: dispute } = await supabase.from('disputes').select('reporter_id').eq('id', disputeId).single();
  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, stripe_payment_intent_id')
    .eq('session_id', sessionId)
    .eq('payer_id', dispute?.reporter_id)
    .eq('status', 'completed')
    .maybeSingle();

  let refundId: string | undefined;

  if (payment?.stripe_payment_intent_id && resolution !== 'dismiss') {
    const refundAmount = resolution === 'refund_full' ? payment.amount : Math.round(payment.amount * 0.5);
    const stripeRefund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmount,
      reason: 'fraudulent',
    });
    refundId = stripeRefund.id;

    await supabase.from('refunds').insert({
      payment_id: payment.id,
      session_id: sessionId,
      user_id: dispute?.reporter_id,
      amount: refundAmount,
      reason: 'admin_dispute_resolution',
      stripe_refund_id: refundId,
      status: 'completed',
    });
  }

  // Update dispute
  await supabase.from('disputes').update({
    status: 'resolved',
    resolution,
    admin_notes: notes || null,
    resolved_at: new Date().toISOString(),
    resolved_by: admin.id,
  }).eq('id', disputeId);

  // Log admin action
  await supabase.from('admin_actions').insert({
    admin_id: admin.id,
    action_type: 'dispute_resolved',
    notes: `Resolution: ${resolution}. ${notes || ''}`.trim(),
  });

  return NextResponse.json({ success: true, refundId });
}
