import { CalendarRange, GitCompare, Download, LayoutGrid, RefreshCw, SlidersHorizontal } from 'lucide-react'
import Button from '../ui/Button'

const PERIODS = [
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: '12m', label: '12M' },
  { id: 'ytd', label: 'YTD' },
]

export default function AnalyticsFilterBar({
  period,
  onPeriodChange,
  compare,
  onCompareChange,
  onRefresh,
  onExport,
  onCustomize,
  loading = false,
  periodLabel,
}) {
  return (
    <div className="mb-3 space-y-2 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-white to-blue-50/50 p-3 dark:from-primary/10 dark:via-slate-900 dark:to-slate-900">
      <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Advanced Analytics</p>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{periodLabel} · Filters update all charts dynamically</p>
        </div>
        <div className="flex flex-wrap items-center space-x-2 space-y-2 lg:space-y-0">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <CalendarRange className="ml-2 h-3.5 w-3.5 text-slate-400" />
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPeriodChange(p.id)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  period === p.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onCompareChange(!compare)}
            className={`inline-flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              compare
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <GitCompare className="h-3.5 w-3.5" />
            <span>Compare</span>
          </button>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRefresh} disabled={loading} className={loading ? 'animate-spin' : ''}>
            {loading ? 'Refreshing…' : 'Refresh' }
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={onExport}>
            Export
          </Button>
          <Button variant="outline" size="sm" icon={LayoutGrid} onClick={onCustomize}>
            Widgets
          </Button>
        </div>
      </div>
    </div>
  )
}
