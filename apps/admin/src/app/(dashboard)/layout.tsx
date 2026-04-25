import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fix: profiles FK is user_id → auth.users.id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, avatar_url')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/unauthorized');

  return (
    <>
      <style>{`
        @keyframes dashFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sidebarSlide {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .dash-sidebar { animation: sidebarSlide 0.4s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .dash-main    { animation: dashFadeIn 0.45s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both; }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-[#F0F4FA]">
        <div className="dash-sidebar">
          <Sidebar />
        </div>
        <div className="dash-main flex flex-1 flex-col overflow-hidden">
          <TopBar profile={profile} />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
