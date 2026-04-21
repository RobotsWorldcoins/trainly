import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAnalytics() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    usersRes, trainersRes, sessionsRes, paymentsRes,
    newUsersRes, newSessionsRes, refundsRes,
    categoryRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['trainer', 'coach_pro']),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('payments').select('amount').eq('status', 'completed').gte('created_at', thirtyDaysAgo),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('refunds').select('amount').eq('status', 'completed').gte('created_at', thirtyDaysAgo),
    supabase.from('sessions').select('category').eq('status', 'published'),
  ]);

  const revenue30d = (paymentsRes.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const refunds30d = (refundsRes.data || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const platformRevenue = revenue30d * 0.10;

  const categoryCounts: Record<string, number> = {};
  (categoryRes.data || []).forEach((s: any) => {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    totalUsers: usersRes.count || 0,
    totalTrainers: trainersRes.count || 0,
    activeSessions: sessionsRes.count || 0,
    revenue30d,
    platformRevenue30d: platformRevenue,
    refunds30d,
    newUsers30d: newUsersRes.count || 0,
    newSessions7d: newSessionsRes.count || 0,
    topCategories,
  };
}

function MetricCard({ label, value, sub, color = 'blue' }: { label: string; value: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-50',
    green: 'border-green-500 bg-green-50',
    purple: 'border-purple-500 bg-purple-50',
    orange: 'border-orange-500 bg-orange-50',
    red: 'border-red-500 bg-red-50',
  };
  return (
    <div className={`rounded-2xl border-t-4 p-5 ${colors[color]}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-3xl font-extrabold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const data = await getAnalytics();
  const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold text-gray-900">Analytics</h1>

      <div>
        <h2 className="text-base font-bold text-gray-700 mb-3">Visão geral</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total utilizadores" value={String(data.totalUsers)} sub={`+${data.newUsers30d} este mês`} color="blue" />
          <MetricCard label="Treinadores ativos" value={String(data.totalTrainers)} color="purple" />
          <MetricCard label="Sessões publicadas" value={String(data.activeSessions)} sub={`+${data.newSessions7d} esta semana`} color="green" />
          <MetricCard label="Revenue (30d)" value={fmt(data.revenue30d)} sub={`Plataforma: ${fmt(data.platformRevenue30d)}`} color="orange" />
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-gray-700 mb-3">Financeiro (últimos 30 dias)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="GMV total" value={fmt(data.revenue30d)} color="green" />
          <MetricCard label="Revenue plataforma (10%)" value={fmt(data.platformRevenue30d)} color="blue" />
          <MetricCard label="Reembolsos emitidos" value={fmt(data.refunds30d)} color="red" />
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-gray-700 mb-3">Categorias mais populares</h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Categoria</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Sessões ativas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.topCategories.map(([cat, count], i) => (
                <tr key={cat}>
                  <td className="px-4 py-3 font-bold text-gray-400">#{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 capitalize">{cat}</td>
                  <td className="px-4 py-3 text-gray-700">{count}</td>
                  <td className="px-4 py-3">
                    <div className="bg-blue-200 rounded-full h-2" style={{ width: `${(count / (data.topCategories[0]?.[1] || 1)) * 100}%`, maxWidth: '160px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
