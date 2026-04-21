import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

  const { reportId, reportedUserId, action } = await req.json();
  if (!reportId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const supabase = await getAdminClient();

  // Update report status
  await supabase.from('reports').update({
    status: action === 'dismiss' ? 'dismissed' : 'actioned',
    resolved_by: admin.id,
    resolved_at: new Date().toISOString(),
  }).eq('id', reportId);

  // Apply action to user
  if (action === 'suspend' && reportedUserId) {
    await supabase.from('profiles').update({ is_suspended: true }).eq('id', reportedUserId);
  }

  await supabase.from('admin_actions').insert({
    admin_id: admin.id,
    action_type: action === 'dismiss' ? 'report_dismissed' : action === 'suspend' ? 'user_suspended' : 'user_warned',
    target_user_id: reportedUserId || null,
  });

  return NextResponse.json({ success: true });
}
