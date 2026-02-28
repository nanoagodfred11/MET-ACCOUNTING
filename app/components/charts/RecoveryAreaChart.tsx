import { useState, useEffect } from 'react';
import { DEFAULT_RECOVERY_TARGET } from '~/lib/config/constants';

interface ChartData {
  date: string;
  recovery: number;
  target: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const recovery = payload[0]?.value as number;
  const diff = recovery - DEFAULT_RECOVERY_TARGET;
  return (
    <div className="bg-navy-900/95 backdrop-blur border border-navy-500/50 rounded-xl px-4 py-3 shadow-xl shadow-black/30">
      <p className="text-xs text-gray-400 mb-1.5 font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-teal-400">{recovery?.toFixed(2)}%</span>
        <span className={`text-xs font-medium ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-navy-500/30">
        <div className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="text-[10px] text-gray-500">Target: {DEFAULT_RECOVERY_TARGET}%</span>
      </div>
    </div>
  );
}

function CustomDot({ cx, cy, payload }: any) {
  if (!cx || !cy) return null;
  const above = payload.recovery >= DEFAULT_RECOVERY_TARGET;
  return (
    <g>
      <circle cx={cx} cy={cy} r={3.5} fill={above ? '#14b8a6' : '#ef4444'} stroke="#0a1628" strokeWidth={1.5} />
    </g>
  );
}

function CustomActiveDot({ cx, cy, payload }: any) {
  if (!cx || !cy) return null;
  const above = payload.recovery >= DEFAULT_RECOVERY_TARGET;
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={above ? '#14b8a6' : '#ef4444'} opacity={0.15} />
      <circle cx={cx} cy={cy} r={6} fill={above ? '#14b8a6' : '#ef4444'} opacity={0.3} />
      <circle cx={cx} cy={cy} r={4} fill={above ? '#14b8a6' : '#ef4444'} stroke="#fff" strokeWidth={2} />
    </g>
  );
}

export function RecoveryAreaChart({ data }: { data: ChartData[] }) {
  const [mod, setMod] = useState<typeof import('recharts') | null>(null);

  useEffect(() => {
    import('recharts').then(setMod).catch(() => {});
  }, []);

  if (data.length === 0) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-gray-600 gap-2">
        <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-sm">No recovery data for this month</span>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="h-72 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-teal-400/50 border-t-teal-400 rounded-full animate-spin" />
          <span className="text-sm">Loading chart...</span>
        </div>
      </div>
    );
  }

  const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } = mod;

  const recoveryValues = data.map((d) => d.recovery);
  const minVal = Math.min(...recoveryValues);
  const maxVal = Math.max(...recoveryValues);
  const yMin = Math.max(0, Math.floor(minVal / 5) * 5 - 5);
  const yMax = Math.min(100, Math.ceil(maxVal / 5) * 5 + 5);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="recoveryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="50%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="#1e3a5f" strokeOpacity={0.4} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#6b7fa0' }}
          tickFormatter={(v: string) => {
            const parts = v.split('-');
            return `${parts[1]}/${parts[2]}`;
          }}
          axisLine={{ stroke: '#1e3a5f' }}
          tickLine={false}
          dy={5}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 10, fill: '#6b7fa0' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          dx={-5}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f5c542', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <ReferenceLine
          y={DEFAULT_RECOVERY_TARGET}
          stroke="#f59e0b"
          strokeDasharray="8 4"
          strokeWidth={1.5}
          label={{
            value: `Target ${DEFAULT_RECOVERY_TARGET}%`,
            fill: '#f59e0b',
            fontSize: 10,
            position: 'insideTopRight',
          }}
        />
        <Area
          type="monotone"
          dataKey="recovery"
          stroke="url(#strokeGrad)"
          strokeWidth={2.5}
          fill="url(#recoveryGrad)"
          dot={<CustomDot />}
          activeDot={<CustomActiveDot />}
          name="Recovery %"
          animationDuration={1500}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
