'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/trainers', icon: '🏋️', label: 'Treinadores' },
  { href: '/users', icon: '👤', label: 'Utilizadores' },
  { href: '/sessions', icon: '📅', label: 'Sessões' },
  { href: '/disputes', icon: '⚠️', label: 'Disputas' },
  { href: '/refunds', icon: '💸', label: 'Reembolsos' },
  { href: '/payouts', icon: '💰', label: 'Pagamentos' },
  { href: '/reports', icon: '🚨', label: 'Reportes' },
  { href: '/analytics', icon: '📈', label: 'Análises' },
  { href: '/settings', icon: '⚙️', label: 'Definições' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-[#1B2A4A] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1B6FEB] rounded-lg flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">T</span>
          </div>
          <div>
            <span className="text-white font-extrabold text-lg">TrainyX</span>
            <span className="block text-white/50 text-xs">Admin Dashboard</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1B6FEB] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <span className="text-white/30 text-xs">v1.0.0 · TrainyX Admin</span>
      </div>
    </aside>
  );
}
