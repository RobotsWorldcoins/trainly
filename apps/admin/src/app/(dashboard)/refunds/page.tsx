import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getRefunds() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data } = await supabase
    .from('refunds')
    .select(`
      id, amount, reason, status, created_at, stripe_refund_id,
      user:profiles!user_id(display_name),
      session:sessions!session_id(title)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  return data || [];
}

export default async function RefundsPage() {
  const refunds = await getRefunds();
  const total = refunds.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Reembolsos</h1>
        <div className="text-right">
          <p className="text-sm text-gray-500">{refunds.length} reembolsos</p>
          <p className="font-bold text-gray-900">Total: €{(total / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Utilizador</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Sessão</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Valor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Motivo</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Data</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {refunds.map((r: any) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.user?.display_name}</td>
                <td className="px-4 py-3 text-gray-700 max-w-40 truncate">{r.session?.title}</td>
                <td className="px-4 py-3 font-bold text-gray-900">€{(r.amount / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.reason}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.created_at).toLocaleDateString('pt-PT')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {refunds.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhum reembolso</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
