'use client';

interface TopBarProps {
  profile: {
    display_name: string;
    avatar_url: string | null;
    role: string;
  };
}

export function TopBar({ profile }: TopBarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{profile.display_name}</p>
          <p className="text-xs text-gray-500">🛡️ Administrador</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#1B6FEB] flex items-center justify-center text-white font-bold text-sm">
          {profile.display_name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
