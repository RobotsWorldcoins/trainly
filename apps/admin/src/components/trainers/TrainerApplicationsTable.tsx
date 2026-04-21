'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Tab = 'pending' | 'active' | 'all';

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  submitted: { label: 'Pendente', class: 'bg-amber-100 text-amber-800' },
  under_review: { label: 'Em Revisão', class: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Aprovada', class: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejeitada', class: 'bg-red-100 text-red-800' },
  more_info_requested: { label: 'Mais Info', class: 'bg-purple-100 text-purple-800' },
};

const ROLE_LABELS: Record<string, { label: string; class: string }> = {
  trainer: { label: 'Treinador', class: 'bg-blue-100 text-blue-800' },
  coach_pro: { label: 'Coach Pro', class: 'bg-purple-100 text-purple-800' },
};

export function TrainerApplicationsTable({ applications, activeTrainers }: {
  applications: any[];
  activeTrainers: any[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  const pendingApps = applications.filter(a =>
    ['submitted', 'under_review', 'more_info_requested'].includes(a.status)
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'pending', label: `Candidaturas (${pendingApps.length})` },
          { key: 'active', label: `Treinadores Ativos (${activeTrainers.length})` },
          { key: 'all', label: `Todas Candidaturas (${applications.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending applications */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Candidato</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Docs</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Submetido</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pendingApps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                    Nenhuma candidatura pendente
                  </td>
                </tr>
              ) : (
                pendingApps.map((app) => {
                  const status = STATUS_LABELS[app.status] ?? { label: app.status, class: 'bg-gray-100 text-gray-800' };
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {app.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{app.full_name}</p>
                            {app.professional_name && (
                              <p className="text-xs text-gray-500">{app.professional_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {app.documents?.length ?? 0} doc(s)
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {app.submitted_at
                          ? format(new Date(app.submitted_at), 'd MMM yyyy', { locale: ptBR })
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/trainers/${app.id}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Rever →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Active trainers */}
      {activeTab === 'active' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Treinador</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Plano</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Avaliação</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeTrainers.map((trainer) => {
                const role = ROLE_LABELS[trainer.role] ?? { label: trainer.role, class: 'bg-gray-100 text-gray-800' };
                return (
                  <tr key={trainer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {trainer.display_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{trainer.display_name}</p>
                          <p className="text-xs text-gray-500">{trainer.city ?? 'Lisboa'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${role.class}`}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {trainer.review_summary?.avg_overall
                        ? `⭐ ${trainer.review_summary.avg_overall.toFixed(1)} (${trainer.review_summary.total_reviews})`
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {trainer.is_suspended ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-800">Suspenso</span>
                      ) : trainer.is_featured ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">⭐ Destaque</span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">Ativo</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/users/${trainer.id}`}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Gerir →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* All applications */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Candidato</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => {
                const status = STATUS_LABELS[app.status] ?? { label: app.status, class: 'bg-gray-100 text-gray-800' };
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{app.full_name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(app.created_at), 'd MMM yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/trainers/${app.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
