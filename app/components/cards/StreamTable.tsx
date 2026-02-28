import type { StreamSummary } from '~/types';
import { formatTonnes, formatGrade, formatMetal, formatMetalOz } from '~/utils/format';

interface StreamTableProps {
  feed: StreamSummary;
  product: StreamSummary;
  tailings: StreamSummary;
  unaccountedMetal: number;
  unaccountedPercent: number;
  status: string;
}

export function StreamTable({ feed, product, tailings, unaccountedMetal, unaccountedPercent, status }: StreamTableProps) {
  const rows = [
    { label: 'Feed (In)', data: feed, bg: 'bg-teal-400/10' },
    { label: 'Product (Gold)', data: product, bg: 'bg-gold-400/10' },
    { label: 'Tailings', data: tailings, bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
      <table className="w-full text-sm min-w-[540px]">
        <thead>
          <tr className="bg-teal-500/20 text-teal-400">
            <th scope="col" className="text-left px-4 py-2.5 font-medium">Stream</th>
            <th scope="col" className="text-right px-4 py-2.5 font-medium">Dry Tonnes</th>
            <th scope="col" className="text-right px-4 py-2.5 font-medium">Grade (g/t Au)</th>
            <th scope="col" className="text-right px-4 py-2.5 font-medium">Metal (kg)</th>
            <th scope="col" className="text-right px-4 py-2.5 font-medium">Metal (oz)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, data, bg }) => (
            <tr key={label} className={`${bg} border-t border-navy-500/20`}>
              <td className="px-4 py-2.5 font-medium">{label}</td>
              <td className="text-right px-4 py-2.5">{formatTonnes(data.dryTonnes)}</td>
              <td className="text-right px-4 py-2.5">{formatGrade(data.weightedGrade)}</td>
              <td className="text-right px-4 py-2.5">{formatMetal(data.containedMetal)}</td>
              <td className="text-right px-4 py-2.5">{formatMetalOz(data.containedMetal)}</td>
            </tr>
          ))}
          <tr className={`border-t-2 border-navy-500/40 ${Math.abs(unaccountedPercent) > 5 ? 'bg-red-500/10' : 'bg-navy-700/50'}`}>
            <td className="px-4 py-2.5 font-medium">Unaccounted</td>
            <td className="text-right px-4 py-2.5">—</td>
            <td className="text-right px-4 py-2.5">—</td>
            <td className={`text-right px-4 py-2.5 font-bold ${Math.abs(unaccountedPercent) > 5 ? 'text-red-400' : 'text-gray-300'}`}>
              {formatMetal(unaccountedMetal)}
            </td>
            <td className={`text-right px-4 py-2.5 font-bold ${Math.abs(unaccountedPercent) > 5 ? 'text-red-400' : 'text-gray-300'}`}>
              {unaccountedPercent.toFixed(2)}%
            </td>
          </tr>
        </tbody>
      </table>
      <div className="flex items-center gap-2 px-4 py-2 bg-navy-900/50 text-xs">
        <span className="text-gray-500">Status:</span>
        <span
          className="font-medium capitalize"
          style={{ color: status === 'final' ? '#22c55e' : status === 'locked' ? '#3b82f6' : status === 'preliminary' ? '#f59e0b' : '#94a3b8' }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
