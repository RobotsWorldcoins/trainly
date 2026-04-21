import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  const authClient = createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify admin
  const supabase = createSupabaseAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { action, rejection_reason, admin_notes } = await req.json();

  // Get application
  const { data: application } = await supabase
    .from('trainer_applications')
    .select('*')
    .eq('id', params.applicationId)
    .single();

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (action === 'approve') {
    // Update application
    await supabase
      .from('trainer_applications')
      .update({
        status: 'approved',
        reviewed_at: now,
        reviewed_by: user.id,
        admin_notes,
      })
      .eq('id', params.applicationId);

    // Update profile role to trainer
    await supabase
      .from('profiles')
      .update({
        role: 'trainer',
        trainer_since: now,
      })
      .eq('user_id', application.user_id);

    // Log admin action
    await supabase.from('admin_actions').insert({
      admin_id: user.id,
      action_type: 'approve_trainer',
      target_type: 'trainer_application',
      target_id: params.applicationId,
      reason: admin_notes ?? 'Application approved',
      metadata: { application_id: params.applicationId, applicant_user_id: application.user_id },
    });

    return NextResponse.json({ success: true, action: 'approved' });
  }

  if (action === 'reject') {
    if (!rejection_reason) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
    }

    await supabase
      .from('trainer_applications')
      .update({
        status: 'rejected',
        reviewed_at: now,
        reviewed_by: user.id,
        rejection_reason,
        admin_notes,
      })
      .eq('id', params.applicationId);

    await supabase.from('admin_actions').insert({
      admin_id: user.id,
      action_type: 'reject_trainer',
      target_type: 'trainer_application',
      target_id: params.applicationId,
      reason: rejection_reason,
    });

    return NextResponse.json({ success: true, action: 'rejected' });
  }

  if (action === 'more_info') {
    await supabase
      .from('trainer_applications')
      .update({
        status: 'more_info_requested',
        reviewed_at: now,
        reviewed_by: user.id,
        admin_notes,
      })
      .eq('id', params.applicationId);

    return NextResponse.json({ success: true, action: 'more_info_requested' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
