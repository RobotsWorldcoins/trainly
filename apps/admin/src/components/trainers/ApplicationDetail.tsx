'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DOC_TYPE_LABELS: Record<string, string> = {
  id_document: '🪪 Identificação',
  certification: '📜 Certificação',
  insurance: '🛡️ Seguro',
  other: '📄 Outro',
};

interface Props {
  application: any;
  profile: any;
}

export function ApplicationDetail({ application: app, profile }: Props) {
  const router = useRouter();
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState(app.admin_notes ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'info' | null>(null);

  const handleAction = async (type: 'approve' | 'reject' | 'more_info') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trainers/${app.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type,
          rejection_reason: rejectionReason,
          admin_notes: adminNotes,
        }),
      });

      if (res.ok) {
        router.push('/trainers');
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Candidatura: {app.full_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Submetida em {app.submitted_at
              ? format(new Date(app.submitted_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
              : '—'}
          </p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
          app.status === 'submitted' ? 'bg-amber-100 text-amber-800' :
          app.status === 'approved' ? 'bg-green-100 text-green-800' :
          app.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {app.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Informação Pessoal</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Nome Completo</dt>
                <dd className="text-sm text-gray-900 mt-1">{app.full_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Nome Profissional</dt>
                <dd className="text-sm text-gray-900 mt-1">{app.professional_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">NIF</dt>
                <dd className="text-sm text-gray-900 mt-1">{app.nif ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">IBAN</dt>
                <dd className="text-sm font-mono text-gray-900 mt-1">{app.iban ?? '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Professional */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Informação Profissional</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Anos de Experiência</dt>
                <dd className="text-sm text-gray-900 mt-1">{app.years_experience ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Especialidades</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {app.specialties?.join(', ') ?? '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-gray-500 uppercase">Certificações</dt>
                <dd className="text-sm text-gray-700 mt-1 leading-relaxed">{app.certifications_desc ?? '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Insurance */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Seguro</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Seguradora</dt>
                <dd className="text-sm text-gray-900 mt-1">{app.insurance_provider ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Nº Apólice</dt>
                <dd className="text-sm font-mono text-gray-900 mt-1">{app.insurance_policy_num ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase">Válido até</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {app.insurance_expires_at
                    ? format(new Date(app.insurance_expires_at), 'd MMM yyyy', { locale: ptBR })
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Documentos</h2>
            {app.documents?.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum documento enviado</p>
            ) : (
              <div className="space-y-2">
                {app.documents?.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span>{DOC_TYPE_LABELS[doc.type] ?? '📄'}</span>
                      <span className="text-sm font-medium text-gray-900">{doc.file_name}</span>
                    </div>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                      target="_blank"
                    >
                      Ver →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Declarations */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Declarações</h2>
            <div className="space-y-2">
              {[
                { key: 'accepts_trainer_terms', label: 'Aceita os Termos do Treinador' },
                { key: 'accepts_safety_rules', label: 'Aceita as Regras de Segurança' },
                { key: 'declares_autonomous', label: 'Declara ser trabalhador independente' },
                { key: 'declares_fit_to_train', label: 'Declara estar apto para treinar' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className={app[key] ? 'text-green-600' : 'text-red-500'}>
                    {app[key] ? '✓' : '✗'}
                  </span>
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action panel */}
        <div className="space-y-4">
          {/* Profile summary */}
          {profile && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Perfil</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {profile.display_name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{profile.display_name}</p>
                  <p className="text-xs text-gray-500">{profile.city ?? 'Lisboa'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {['submitted', 'under_review', 'more_info_requested'].includes(app.status) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Decisão</h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                    Notas do Admin
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none"
                    rows={3}
                    placeholder="Notas internas..."
                  />
                </div>

                {action === 'reject' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      Motivo de Rejeição *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      className="w-full border border-red-200 rounded-lg p-3 text-sm resize-none"
                      rows={3}
                      placeholder="Explica o motivo da rejeição..."
                    />
                  </div>
                )}

                <button
                  onClick={() => handleAction('approve')}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  ✓ Aprovar Candidatura
                </button>

                <button
                  onClick={() => {
                    if (action === 'reject') {
                      handleAction('reject');
                    } else {
                      setAction('reject');
                    }
                  }}
                  disabled={isLoading}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 rounded-lg text-sm border border-red-200 transition-colors disabled:opacity-50"
                >
                  ✗ {action === 'reject' ? 'Confirmar Rejeição' : 'Rejeitar'}
                </button>

                <button
                  onClick={() => handleAction('more_info')}
                  disabled={isLoading}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold py-3 rounded-lg text-sm border border-amber-200 transition-colors disabled:opacity-50"
                >
                  📋 Pedir Mais Informação
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
