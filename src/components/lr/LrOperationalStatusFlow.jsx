import { Check } from 'lucide-react'

/**
 * Clickable operational status flow for LR Management queues.
 */
export default function LrOperationalStatusFlow({
  steps,
  selectedId,
  onSelect,
  counts = {},
  showTitle = true,
}) {
  const selectedIdx = steps.findIndex((s) => s.id === selectedId)

  return (
    <div className="w-full overflow-x-auto">
      {showTitle && (
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          LR Status Flow
          <span className="ml-2 font-normal text-slate-500">— click a status to filter records</span>
        </p>
      )}
      <div className="flex min-w-[960px] items-start gap-0 pb-1">
        {steps.map((step, i) => {
          const selected = step.id === selectedId
          const beforeSelected = selectedIdx >= 0 && i < selectedIdx
          const count = counts[step.stage] ?? 0
          return (
            <div key={step.id} className="flex flex-1 min-w-0 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div className={`h-0.5 flex-1 ${beforeSelected || selected ? 'bg-violet-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
                <button
                  type="button"
                  onClick={() => onSelect?.(step)}
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all hover:scale-105 ${
                    selected
                      ? 'border-violet-600 bg-violet-600 text-white ring-4 ring-violet-200 dark:ring-violet-900'
                      : beforeSelected
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-slate-500 hover:border-violet-400 dark:border-slate-600 dark:bg-slate-800'
                  }`}
                  title={step.label}
                >
                  {beforeSelected ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </button>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${beforeSelected ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
              </div>
              <button
                type="button"
                onClick={() => onSelect?.(step)}
                className={`mt-2 w-full px-0.5 text-center text-[10px] leading-tight sm:text-xs ${
                  selected
                    ? 'font-semibold text-violet-700 dark:text-violet-300'
                    : beforeSelected
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-600 hover:text-violet-600 dark:text-slate-400'
                }`}
              >
                {step.label}
                {count > 0 && (
                  <span className="mt-0.5 block text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                    ({count})
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
