interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: 'gold' | 'teal' | 'red' | 'green' | 'blue';
}

const accentStyles = {
  gold: 'border-t-gold-400',
  teal: 'border-t-teal-400',
  red: 'border-t-red-500',
  green: 'border-t-green-500',
  blue: 'border-t-blue-500',
};

export function StatCard({ title, value, subtitle, accent = 'gold' }: StatCardProps) {
  return (
    <div
      className={`bg-navy-700 rounded-lg border-t-2 ${accentStyles[accent]} p-3 sm:p-4 hover:bg-navy-700/80 transition-colors animate-[fadeInUp_0.3s_ease-out]`}
    >
      <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-lg sm:text-2xl font-bold text-gold-400 truncate">{value}</p>
      {subtitle && <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
    </div>
  );
}
