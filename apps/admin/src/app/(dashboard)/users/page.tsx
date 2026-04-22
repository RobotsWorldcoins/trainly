import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserActions } from '@/components/users/UserActions';

async function getUsers() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, email, role, created_at, total_xp, current_level, is_suspended')
    .order('created_at', { ascending: false })
    .limit(100);

  return data || [];
}

const ROLE_COLORS: Record<string, string> = {
  user_free: 'bg-gray-100 text-gray-700',
  user_plus: 'bg-blue-100 text-blue-700',
  trainer: 'bg-green-100 text-green-700',
  trainer_pending: 'bg-yellow-100 text-yellow-700',
  coach_pro: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
};

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Utilizadores</h1>
        <span className="text-sm text-gray-500">{users.length} utilizadores</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Utilizador</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Papel</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nível / XP</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Registo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{user.display_name}</div>
                    <div className="text-gray-500 text-xs">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">Nível {user.current_level}</span>
                    <span className="text-gray-400 text-xs ml-1">({user.total_xp} XP)</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_suspended ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Suspenso</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Ativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <UserActions userId={user.id} isSuspended={user.is_suspended} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
