import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  submitted: { label: 'Submetida', class: 'bg-amber-100 text-amber-800' },
  under_review: { label: 'Em Revisão', class: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Aprovada', class: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejeitada', class: 'bg-red-100 text-red-800' },
  more_info_requested: { label: 'Mais Info', class: 'bg-purple-100 text-purple-800' },
};

interface Application {
  id: string;
  status: string;
  full_name: string;
  submitted_at: string;
  profile?: { display_name: string; avatar_url: string | null };
}

export function RecentApplications({ applications }: { applications: Application[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Candidaturas Recentes</h2>
        <Link href="/trainers" className="text-sm text-blue-600 hover:underline font-medium">
          Ver todas →
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {applications.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            Nenhuma candidatura pendente
          </div>
        ) : (
          applications.map((app) => {
            const status = STATUS_LABELS[app.status] ?? { label: app.status, class: 'bg-gray-100 text-gray-800' };
            return (
              <Link
                key={app.id}
                href={`/trainers/${app.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {app.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{app.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {app.submitted_at
                      ? format(new Date(app.submitted_at), 'd MMM yyyy', { locale: ptBR })
                      : '—'}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.class}`}>
                  {status.label}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
