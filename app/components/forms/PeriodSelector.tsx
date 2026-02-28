import { useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { addDays, toISODate } from '~/utils/format';

interface PeriodSelectorProps {
  showShift?: boolean;
}

export function PeriodSelector({ showShift = true }: PeriodSelectorProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const today = toISODate(new Date());
  const date = searchParams.get('date') || today;
  const periodType = searchParams.get('periodType') || 'daily';
  const shift = searchParams.get('shift') || '1';

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  }

  function changeDate(delta: number) {
    updateParam('date', addDays(date, delta));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {/* Period type selector */}
      <select
        value={periodType}
        onChange={(e) => updateParam('periodType', e.target.value)}
        className="bg-navy-700/60 border border-navy-500/30 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-teal-400 cursor-pointer"
      >
        <option value="daily" className="bg-navy-700">Daily</option>
        {showShift && <option value="shift" className="bg-navy-700">Shift</option>}
      </select>

      {/* Shift selector */}
      {showShift && periodType === 'shift' && (
        <select
          value={shift}
          onChange={(e) => updateParam('shift', e.target.value)}
          className="bg-navy-700/60 border border-navy-500/30 rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-teal-400 cursor-pointer"
        >
          <option value="1" className="bg-navy-700">Day</option>
          <option value="2" className="bg-navy-700">Night</option>
        </select>
      )}

      {/* Date nav group */}
      <div className="flex items-center gap-1 bg-navy-700/60 rounded-lg px-1 py-0.5 border border-navy-500/30">
        <button
          onClick={() => changeDate(-1)}
          className="p-1.5 rounded-md hover:bg-navy-600 text-gray-400 hover:text-teal-400 transition-colors active:scale-95"
          aria-label="Previous day"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <div className="relative">
          <Calendar size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" aria-hidden="true" />
          <input
            type="date"
            value={date}
            onChange={(e) => updateParam('date', e.target.value)}
            className="bg-navy-600/50 border border-navy-500/30 rounded-md pl-7 pr-1.5 py-1 text-sm text-gray-200 focus:outline-none focus:border-teal-400 w-[130px] sm:w-[140px] cursor-pointer"
          />
        </div>
        <button
          onClick={() => changeDate(1)}
          className="p-1.5 rounded-md hover:bg-navy-600 text-gray-400 hover:text-teal-400 transition-colors active:scale-95"
          aria-label="Next day"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
