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

  const { paymentId, amount, reason } = await req.json();
  if (!paymentId || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const supabase = await getAdminClient();

  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, stripe_payment_intent_id, payer_id, session_id')
    .eq('id', paymentId)
    .single();

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  const refundAmount = Math.min(amount, payment.amount);

  const stripeRefund = await stripe.refunds.create({
    payment_intent: payment.stripe_payment_intent_id,
    amount: refundAmount,
    reason: 'requested_by_customer',
  });

  await supabase.from('refunds').insert({
    payment_id: payment.id,
    session_id: payment.session_id,
    user_id: payment.payer_id,
    amount: refundAmount,
    reason: reason || 'admin_manual_refund',
    stripe_refund_id: stripeRefund.id,
    status: 'completed',
  });

  await supabase.from('admin_actions').insert({
    admin_id: admin.id,
    action_type: 'refund_issued',
    notes: `Manual refund of ${refundAmount} cents. Reason: ${reason}`,
  });

  return NextResponse.json({ success: true, refundId: stripeRefund.id, amount: refundAmount });
}
