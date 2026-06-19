import { BarChart3 } from 'lucide-react'

export default function ChartPlaceholder({ title, type = 'bar', data = [], height = 'h-40', compact = false }) {
  const max = Math.max(...data.map((d) => d.value ?? d.utilization ?? 0), 1)
  const h = compact ? 'h-28 sm:h-32' : height

  return (
    <div className={`${h} flex min-h-0 flex-col`}>
      <div className="mb-2 flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600 sm:text-sm dark:text-slate-400">
        <BarChart3 className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
        <span className="truncate">{title}</span>
      </div>
      {type === 'bar' && (
        <div className="flex min-h-0 flex-1 items-end gap-1 sm:gap-2">
          {data.map((d) => (
            <div key={d.month ?? d.label} className="flex flex-1 flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary sm:rounded-t-lg"
                style={{ height: `${((d.value ?? 0) / max) * 100}%`, minHeight: '3px' }}
              />
              <span className="text-[8px] text-slate-500 sm:text-[10px]">{d.month ?? d.label}</span>
            </div>
          ))}
        </div>
      )}
      {type === 'donut' && (
        <div className="flex min-h-0 flex-1 items-center justify-center gap-3 sm:gap-6">
          <div className={`relative ${compact ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-32 w-32'}`}>
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              {data.reduce((acc, d, i) => {
                const offset = acc.offset
                const pct = d.value
                acc.elements.push(
                  <circle
                    key={d.label}
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke={d.color}
                    strokeWidth="3"
                    strokeDasharray={`${pct} ${100 - pct}`}
                    strokeDashoffset={-offset}
                  />,
                )
                acc.offset += pct
                return acc
              }, { offset: 0, elements: [] }).elements}
            </svg>
          </div>
          <div className="space-y-1">
            {data.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5 text-xs sm:text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-slate-600 dark:text-slate-400">{d.label}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {type === 'horizontal' && (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
          {data.map((d) => (
            <div key={d.vehicle ?? d.label}>
              <div className="mb-0.5 flex justify-between text-[10px] sm:text-xs">
                <span className="truncate text-slate-600 dark:text-slate-400">{d.vehicle ?? d.label}</span>
                <span className="font-medium">{d.utilization ?? d.value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 sm:h-2 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${d.utilization ?? d.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
