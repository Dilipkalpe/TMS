import { X } from 'lucide-react'
import { buildLrActiveFilterChips } from '../../utils/lrListFilterUtils'

/** One-line active filter summary — each applied filter on its own row. */
export default function LrListActiveFilterChips({ filters, onRemove, onClearAll }) {
  const chips = buildLrActiveFilterChips(filters)
  if (!chips.length) return null

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 dark:border-primary/30 dark:bg-primary/10">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-primary">Active filters</p>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400"
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {chips.map((chip) => (
          <div
            key={chip.id}
            className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <span className="min-w-0 truncate font-medium">{chip.text}</span>
            <button
              type="button"
              onClick={() => onRemove(chip.keys)}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-700"
              aria-label={`Remove ${chip.text}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
