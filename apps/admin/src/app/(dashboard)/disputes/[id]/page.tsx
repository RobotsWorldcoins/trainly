import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { DisputeActions } from '@/components/disputes/DisputeActions';

async function getDispute(id: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data } = await supabase
    .from('disputes')
    .select(`
      *,
      reporter:profiles!reporter_id(id, display_name, email),
      session:sessions!session_id(id, title, date, start_time, price, trainer:profiles!trainer_id(display_name))
    `)
    .eq('id', id)
    .single();

  return data;
}

export default async function DisputeDetailPage({ params }: { params: { id: string } }) {
  const dispute = await getDispute(params.id);
  if (!dispute) notFound();

  const session = dispute.session as any;
  const reporter = dispute.reporter as any;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <a href="/disputes" className="text-gray-400 hover:text-gray-700">← Disputas</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-extrabold text-gray-900">Disputa #{params.id.slice(0, 8)}</h1>
      </div>

      {/* Reporter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-bold text-gray-900">Reclamante</h2>
        <p className="text-gray-700">{reporter?.display_name} <span className="text-gray-400 text-sm">({reporter?.email})</span></p>
      </div>

      {/* Session */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-bold text-gray-900">Sessão</h2>
        <p className="font-semibold text-gray-900">{session?.title}</p>
        <p className="text-gray-500 text-sm">
          {new Date(session?.date).toLocaleDateString('pt-PT')} · {session?.start_time?.slice(0, 5)}
        </p>
        <p className="text-gray-500 text-sm">Treinador: {session?.trainer?.display_name}</p>
        <p className="text-gray-500 text-sm">Preço: {session?.price === 0 ? 'Grátis' : `€${session?.price?.toFixed(2)}`}</p>
      </div>

      {/* Dispute details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-bold text-gray-900">Detalhes da disputa</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Motivo:</span>
            <p className="font-medium text-gray-900 mt-0.5">{dispute.reason}</p>
          </div>
          <div>
            <span className="text-gray-500">Estado:</span>
            <p className="font-medium text-gray-900 mt-0.5">{dispute.status}</p>
          </div>
        </div>
        {dispute.description && (
          <div>
            <span className="text-gray-500 text-sm">Descrição:</span>
            <p className="text-gray-700 mt-1 whitespace-pre-wrap">{dispute.description}</p>
          </div>
        )}
        {dispute.admin_notes && (
          <div className="bg-yellow-50 rounded-xl p-3">
            <span className="text-yellow-800 text-sm font-semibold">Notas admin:</span>
            <p className="text-yellow-700 text-sm mt-1">{dispute.admin_notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
        <DisputeActions disputeId={params.id} sessionId={dispute.session_id} />
      )}
    </div>
  );
}
