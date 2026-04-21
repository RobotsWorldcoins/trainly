'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DisputeActions({ disputeId, sessionId }: { disputeId: string; sessionId: string }) {
  const router = useRouter();
  const [resolution, setResolution] = useState<'refund_full' | 'refund_partial' | 'dismiss' | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResolve = async () => {
    if (!resolution) return;
    setLoading(true);
    await fetch('/api/disputes/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disputeId, sessionId, resolution, notes }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <h2 className="font-bold text-gray-900">Resolver disputa</h2>

      <div className="space-y-2">
        {[
          { value: 'refund_full', label: '💶 Reembolso total ao utilizador' },
          { value: 'refund_partial', label: '💵 Reembolso parcial (50%)' },
          { value: 'dismiss', label: '❌ Dispensar disputa' },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
            <input
              type="radio"
              value={opt.value}
              checked={resolution === opt.value}
              onChange={e => setResolution(e.target.value as any)}
              className="accent-blue-600"
            />
            <span className="font-medium text-gray-800">{opt.label}</span>
          </label>
        ))}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Notas (opcional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Justificação da decisão..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        onClick={handleResolve}
        disabled={!resolution || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
      >
        {loading ? 'A processar...' : 'Resolver disputa'}
      </button>
    </div>
  );
}
