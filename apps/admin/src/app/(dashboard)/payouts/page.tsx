import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getPayouts() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data } = await supabase
    .from('payouts')
    .select(`
      id, amount, status, created_at, stripe_transfer_id,
      trainer:profiles!trainer_id(display_name),
      session:sessions!session_id(title)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  return data || [];
}

export default async function PayoutsPage() {
  const payouts = await getPayouts();
  const completed = payouts.filter((p: any) => p.status === 'completed');
  const totalPaid = completed.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Pagamentos a treinadores</h1>
        <div className="text-right">
          <p className="text-sm text-gray-500">{payouts.length} transferências</p>
          <p className="font-bold text-green-600">Pago: €{(totalPaid / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Treinador</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Sessão</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Valor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Stripe Transfer</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Data</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payouts.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.trainer?.display_name}</td>
                <td className="px-4 py-3 text-gray-700 max-w-40 truncate">{p.session?.title}</td>
                <td className="px-4 py-3 font-bold text-gray-900">€{(p.amount / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                  {p.stripe_transfer_id ? p.stripe_transfer_id.slice(0, 20) + '…' : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString('pt-PT')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhum pagamento</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
