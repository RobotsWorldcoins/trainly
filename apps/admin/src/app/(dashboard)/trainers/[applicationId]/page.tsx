import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ApplicationDetail } from '@/components/trainers/ApplicationDetail';

export default async function ApplicationDetailPage({
  params,
}: {
  params: { applicationId: string };
}) {
  const supabase = createSupabaseAdminClient();

  const { data: application } = await supabase
    .from('trainer_applications')
    .select(`
      *,
      documents:trainer_documents(*)
    `)
    .eq('id', params.applicationId)
    .single();

  if (!application) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', application.user_id)
    .single();

  return (
    <div className="space-y-6">
      <ApplicationDetail application={application} profile={profile} />
    </div>
  );
}
