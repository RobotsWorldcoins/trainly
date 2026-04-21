'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReportActions({ reportId, reportedUserId }: { reportId: string; reportedUserId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handle = async (action: 'dismiss' | 'warn' | 'suspend') => {
    setLoading(true);
    await fetch('/api/reports/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, reportedUserId, action }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="flex gap-2 shrink-0">
      <button onClick={() => handle('dismiss')} disabled={loading} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
        Dispensar
      </button>
      <button onClick={() => handle('warn')} disabled={loading} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50">
        Avisar
      </button>
      <button onClick={() => handle('suspend')} disabled={loading} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">
        Suspender
      </button>
    </div>
  );
}
