import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Dispute {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  session?: { title: string };
}

export function RecentDisputes({ disputes }: { disputes: Dispute[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Disputas Abertas</h2>
        <Link href="/disputes" className="text-sm text-blue-600 hover:underline font-medium">
          Ver todas →
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {disputes.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            Nenhuma disputa aberta
          </div>
        ) : (
          disputes.map((dispute) => (
            <Link
              key={dispute.id}
              href={`/disputes/${dispute.id}`}
              className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {dispute.session?.title ?? 'Sessão desconhecida'}
                </p>
                <p className="text-xs text-gray-500 truncate">{dispute.reason}</p>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">
                {format(new Date(dispute.created_at), 'd MMM', { locale: ptBR })}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
