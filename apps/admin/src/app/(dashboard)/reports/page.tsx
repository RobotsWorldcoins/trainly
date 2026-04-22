import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ReportActions } from '@/components/reports/ReportActions';

async function getReports() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data } = await supabase
    .from('reports')
    .select(`
      id, reason, description, status, created_at,
      reporter:profiles!reporter_id(display_name),
      reported_user:profiles!reported_user_id(display_name)
    `)
    .order('created_at', { ascending: false });

  return data || [];
}

export default async function ReportsPage() {
  const reports = await getReports();
  const open = reports.filter((r: any) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Reportes de conteúdo</h1>
          {open > 0 && <p className="text-sm text-red-600 font-medium mt-0.5">{open} pendentes</p>}
        </div>
      </div>

      <div className="space-y-3">
        {reports.map((r: any) => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${r.status === 'pending' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {r.status}
                </span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('pt-PT')}</span>
              </div>
              <p className="font-semibold text-gray-900">
                {r.reporter?.display_name} reportou {r.reported_user?.display_name}
              </p>
              <p className="text-sm text-gray-500">Motivo: {r.reason}</p>
              {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
            </div>
            {r.status === 'pending' && (
              <ReportActions reportId={r.id} reportedUserId={r.reported_user_id} />
            )}
          </div>
        ))}
        {reports.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
            Nenhum reporte
          </div>
        )}
      </div>
    </div>
  );
}
