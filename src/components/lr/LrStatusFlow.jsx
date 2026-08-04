import { Check } from 'lucide-react'
import { LR_STATUS_STEPS, lrStatusStepIndex } from '../../constants/lrStatusFlow'

/**
 * Visual LR status pipeline — Draft → … → Closed
 * @param {string} [currentStatus] — omit for legend-only (no step highlighted as current)
 * @param {'horizontal'|'vertical'} [layout]
 * @param {boolean} [showTitle]
 * @param {boolean} [highlightCurrent] — false = show all steps equally (list page legend)
 */
export default function LrStatusFlow({
  currentStatus,
  layout = 'horizontal',
  showTitle = true,
  highlightCurrent = true,
}) {
  const currentIdx = highlightCurrent && currentStatus
    ? lrStatusStepIndex(currentStatus)
    : -1

  if (layout === 'vertical') {
    return (
      <div className="w-full">
        {showTitle && (
          <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            LR Status Flow
          </p>
        )}
        <ol className="space-y-0">
          {LR_STATUS_STEPS.map((step, i) => {
            const done = currentIdx >= 0 && i < currentIdx
            const current = i === currentIdx
            const pending = currentIdx >= 0 && i > currentIdx
            return (
              <li key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      current
                        ? 'border-violet-600 bg-violet-600 text-white ring-4 ring-violet-200 dark:ring-violet-900'
                        : done
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </div>
                  {i < LR_STATUS_STEPS.length - 1 && (
                    <div
                      className={`my-0.5 w-0.5 flex-1 min-h-[1.25rem] ${
                        done ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                </div>
                <div className={`pb-4 pt-1 ${pending ? 'opacity-50' : ''}`}>
                  <p
                    className={`text-sm font-medium ${
                      current
                        ? 'text-violet-700 dark:text-violet-300'
                        : done
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {step}
                    {current && (
                      <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
                        Current
                      </span>
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      {showTitle && (
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          LR Status Flow
          {highlightCurrent && currentStatus && (
            <span className="ml-2 font-normal text-slate-500">
              — {currentStatus}
            </span>
          )}
        </p>
      )}
      <div className="flex min-w-[720px] items-start gap-0 pb-1">
        {LR_STATUS_STEPS.map((step, i) => {
          const done = currentIdx >= 0 && i < currentIdx
          const current = i === currentIdx
          const pending = currentIdx >= 0 && i > currentIdx
          return (
            <div key={step} className="flex flex-1 min-w-0 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${done || current ? 'bg-violet-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                  />
                )}
                <div
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                    current
                      ? 'border-violet-600 bg-violet-600 text-white ring-4 ring-violet-200 dark:ring-violet-900'
                      : done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800'
                  }`}
                  title={step}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </div>
                {i < LR_STATUS_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${done ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                  />
                )}
              </div>
              <p
                className={`mt-2 px-0.5 text-center text-[10px] leading-tight sm:text-xs ${
                  pending ? 'text-slate-400' : current ? 'font-semibold text-violet-700 dark:text-violet-300' : done ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {step}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
