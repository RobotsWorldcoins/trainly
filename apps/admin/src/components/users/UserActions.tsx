'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UserActions({ userId, isSuspended }: { userId: string; isSuspended: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggleSuspend = async () => {
    setLoading(true);
    await fetch('/api/users/suspend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, suspend: !isSuspended }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleToggleSuspend}
      disabled={loading}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        isSuspended
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-red-100 text-red-700 hover:bg-red-200'
      }`}
    >
      {loading ? '...' : isSuspended ? 'Reativar' : 'Suspender'}
    </button>
  );
}
