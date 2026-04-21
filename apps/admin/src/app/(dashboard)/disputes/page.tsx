import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

async function getDisputes() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data } = await supabase
    .from('disputes')
    .select(`
      id, reason, status, created_at,
      reporter:profiles!reporter_id(display_name),
      session:sessions!session_id(title)
    `)
    .order('created_at', { ascending: false });

  return data || [];
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export default async function DisputesPage() {
  const disputes = await getDisputes();
  const open = disputes.filter((d: any) => d.status === 'open').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Disputas</h1>
          {open > 0 && (
            <p className="text-sm text-red-600 font-medium mt-0.5">{open} disputa{open !== 1 ? 's' : ''} aberta{open !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Reclamante</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Sessão</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Motivo</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Data</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {disputes.map((d: any) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{d.reporter?.display_name}</td>
                <td className="px-4 py-3 text-gray-700 max-w-40 truncate">{d.session?.title}</td>
                <td className="px-4 py-3 text-gray-500">{d.reason}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(d.created_at).toLocaleDateString('pt-PT')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-700'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/disputes/${d.id}`} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
            {disputes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhuma disputa</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
