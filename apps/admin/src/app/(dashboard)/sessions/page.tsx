import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

async function getSessions() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data } = await supabase
    .from('sessions')
    .select(`
      id, title, category, type, status, date, start_time, price,
      current_participants, max_participants, created_at,
      trainer:profiles!trainer_id(display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  return data || [];
}

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
};

export default async function SessionsPage() {
  const sessions = await getSessions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Sessões</h1>
        <span className="text-sm text-gray-500">{sessions.length} sessões</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Sessão</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Treinador</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Data</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Vagas</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Preço</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 max-w-48 truncate">{s.title}</div>
                    <div className="text-gray-400 text-xs">{s.category} · {s.type}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{s.trainer?.display_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(s.date).toLocaleDateString('pt-PT')}
                    <span className="ml-1 text-xs">{s.start_time?.slice(0, 5)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${s.current_participants >= s.max_participants ? 'text-red-600' : 'text-gray-700'}`}>
                      {s.current_participants}/{s.max_participants}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {s.price === 0 ? 'Grátis' : `€${s.price?.toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-700'}`}>
                      {s.status}
                    </span>
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
