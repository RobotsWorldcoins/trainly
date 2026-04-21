import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentApplications } from '@/components/dashboard/RecentApplications';
import { RecentDisputes } from '@/components/dashboard/RecentDisputes';

async function getDashboardStats() {
  const supabase = createSupabaseAdminClient();

  const [
    { count: totalUsers },
    { count: totalTrainers },
    { count: pendingApplications },
    { count: activeSessions },
    { count: openDisputes },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['trainer', 'coach_pro']),
    supabase.from('trainer_applications').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('payments')
      .select('amount_cents, platform_fee_cents')
      .eq('status', 'released')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const monthlyRevenue = (revenueData || []).reduce(
    (sum: number, p: any) => sum + (p.platform_fee_cents ?? 0), 0
  ) / 100;

  return {
    totalUsers: totalUsers ?? 0,
    totalTrainers: totalTrainers ?? 0,
    pendingApplications: pendingApplications ?? 0,
    activeSessions: activeSessions ?? 0,
    openDisputes: openDisputes ?? 0,
    monthlyRevenue,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const supabase = createSupabaseAdminClient();

  const { data: recentApplications } = await supabase
    .from('trainer_applications')
    .select(`
      id, status, full_name, submitted_at,
      profile:profiles!user_id(display_name, avatar_url)
    `)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(5);

  const { data: recentDisputes } = await supabase
    .from('disputes')
    .select(`
      id, reason, status, created_at,
      session:sessions(title)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral da plataforma Trainly</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Utilizadores"
          value={stats.totalUsers.toString()}
          icon="👤"
          color="blue"
        />
        <StatCard
          title="Treinadores"
          value={stats.totalTrainers.toString()}
          icon="🏋️"
          color="green"
        />
        <StatCard
          title="Candidaturas"
          value={stats.pendingApplications.toString()}
          icon="⏳"
          color="yellow"
          urgent={stats.pendingApplications > 0}
        />
        <StatCard
          title="Sessões Ativas"
          value={stats.activeSessions.toString()}
          icon="📅"
          color="purple"
        />
        <StatCard
          title="Disputas Abertas"
          value={stats.openDisputes.toString()}
          icon="⚠️"
          color="red"
          urgent={stats.openDisputes > 0}
        />
        <StatCard
          title="Receita (30d)"
          value={`€${stats.monthlyRevenue.toFixed(2)}`}
          icon="💰"
          color="blue"
        />
      </div>

      {/* Recent items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentApplications applications={recentApplications ?? []} />
        <RecentDisputes disputes={recentDisputes ?? []} />
      </div>
    </div>
  );
}
