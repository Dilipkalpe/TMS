import {
  Columns3, Download, Filter, Plus, Printer, RefreshCw, Search,
} from 'lucide-react'

/** Shared ops list action bar (Loading Slip, Transit Pass, etc.). */
export default function OpsListActionBar({
  newLabel,
  onNew,
  onSearch,
  onExport,
  onPrint,
  onManageColumns,
  onRefresh,
  onFilter,
  activeFilterCount = 0,
}) {
  const btn =
    'inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary/30 hover:bg-slate-50 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'

  const filterBtn = activeFilterCount > 0
    ? 'inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/15 sm:text-sm'
    : btn

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={onNew}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
      >
        <Plus className="h-4 w-4" />
        {newLabel}
        <span className="hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold sm:inline">F2</span>
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={btn} onClick={onSearch}>
          <Search className="h-4 w-4 text-primary" />
          Search
          <span className="hidden text-[10px] text-slate-400 sm:inline">(F3)</span>
        </button>
        <button type="button" className={btn} onClick={onExport}>
          <Download className="h-4 w-4 text-green-600" />
          Export Excel
        </button>
        <button type="button" className={btn} onClick={onPrint}>
          <Printer className="h-4 w-4 text-slate-500" />
          Print
        </button>
        <button type="button" className={btn} onClick={onManageColumns}>
          <Columns3 className="h-4 w-4 text-slate-500" />
          Column
        </button>
        <button type="button" className={filterBtn} onClick={onFilter}>
          <Filter className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <button type="button" className={btn} onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 text-slate-500" />
          Refresh
        </button>
      </div>
    </div>
  )
}
