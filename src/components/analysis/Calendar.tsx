import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { classNames, todayISO } from '../../utils/geo';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarProps {
  value: string | null;
  onChange: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
}

export function Calendar({ value, onChange, minDate = '2024-01-01', maxDate }: CalendarProps) {
  const max = maxDate ?? todayISO();
  const initial = value ?? max;
  const [viewYear, setViewYear] = useState(Number(initial.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(Number(initial.slice(5, 7)) - 1);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: Array<string | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const canPrev =
    viewYear > Number(minDate.slice(0, 4)) ||
    (viewYear === Number(minDate.slice(0, 4)) && viewMonth > Number(minDate.slice(5, 7)) - 1);
  const canNext =
    viewYear < Number(max.slice(0, 4)) ||
    (viewYear === Number(max.slice(0, 4)) && viewMonth < Number(max.slice(5, 7)) - 1);

  return (
    <div className="rounded-xl border border-navy-800 bg-navy-900 shadow-panel">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={prevMonth}
          disabled={!canPrev}
          className="rounded-lg p-1.5 text-navy-300 hover:bg-navy-800/50 disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft size={17} />
        </button>
        <p className="text-sm font-bold text-white">
          {MONTHS[viewMonth]} {viewYear}
        </p>
        <button
          onClick={nextMonth}
          disabled={!canNext}
          className="rounded-lg p-1.5 text-navy-300 hover:bg-navy-800/50 disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 px-3 pb-1">
        {WEEKDAYS.map((d) => (
          <p key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-navy-400">
            {d}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 p-2">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`e-${i}`} />;
          const disabled = iso < minDate || iso > max;
          const selected = iso === value;
          const isToday = iso === todayISO();
          return (
            <button
              key={iso}
              disabled={disabled}
              onClick={() => onChange(iso)}
              aria-pressed={selected}
              aria-label={`Select ${iso}`}
              className={classNames(
                'flex h-9 items-center justify-center rounded-lg text-[13px] font-medium transition-colors',
                selected
                  ? 'bg-brand-600 font-bold text-white shadow-sm'
                  : disabled
                    ? 'text-navy-200'
                    : 'text-navy-200 hover:bg-brand-500/12',
                isToday && !selected && 'font-bold text-brand-400',
              )}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
