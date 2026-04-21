import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { TrainerApplicationsTable } from '@/components/trainers/TrainerApplicationsTable';

export default async function TrainersPage() {
  const supabase = createSupabaseAdminClient();

  const { data: applications } = await supabase
    .from('trainer_applications')
    .select(`
      id, status, full_name, professional_name, years_experience,
      specialties, submitted_at, created_at, reviewed_at,
      rejection_reason, admin_notes,
      user_id,
      documents:trainer_documents(id, type, file_name, storage_path, is_verified)
    `)
    .order('submitted_at', { ascending: false })
    .limit(100);

  const { data: activeTrainers } = await supabase
    .from('profiles')
    .select(`
      id, display_name, avatar_url, role, city, is_featured, is_suspended,
      trainer_since, created_at,
      specialties:trainer_specialties(category),
      review_summary:trainer_review_summary(avg_overall, total_reviews)
    `)
    .in('role', ['trainer', 'coach_pro'])
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Treinadores</h1>
        <p className="text-sm text-gray-500 mt-1">Gerir candidaturas e treinadores ativos</p>
      </div>

      <TrainerApplicationsTable
        applications={applications ?? []}
        activeTrainers={activeTrainers ?? []}
      />
    </div>
  );
}
