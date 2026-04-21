interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  urgent?: boolean;
  trend?: string;
}

const COLOR_MAP = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  yellow: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
};

export function StatCard({ title, value, icon, color, urgent, trend }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${urgent ? 'ring-2 ring-red-400' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{icon}</span>
        {urgent && (
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-1">{title}</p>
      {trend && (
        <p className="text-xs text-green-600 mt-1">{trend}</p>
      )}
    </div>
  );
}
