import {
  ChevronDown,
  Columns3,
  Download,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import Button from './Button'

export default function ERPListToolbar({
  addLabel = 'Add New Record',
  onAdd,
  showAdd = true,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterValue,
  onFilterChange,
  filterOptions = ['(All)'],
  onRefresh,
  onManageColumns,
  onExport,
  recordCount = 0,
  extra,
}) {
  return (
    <div className="shrink-0 space-y-2 border-x border-primary/20 bg-white px-2 py-2 sm:px-3 sm:py-3 dark:bg-slate-900">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {showAdd && onAdd && (
            <Button icon={Plus} onClick={onAdd} className="w-full sm:w-auto">
              {addLabel}
            </Button>
          )}
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-primary/30 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          {filterOptions.length > 0 && (
            <div className="w-full min-w-[120px] sm:w-36">
              <select
                value={filterValue ?? filterOptions[0]}
                onChange={(e) => onFilterChange?.(e.target.value)}
                className="w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {filterOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRefresh}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon={Columns3} onClick={onManageColumns}>
            <span className="hidden sm:inline">Manage Columns</span>
            <span className="sm:hidden">Columns</span>
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={onExport}>
            <span className="hidden sm:inline">Export Data</span>
            <span className="sm:hidden">Export</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {extra}
      <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
        {recordCount.toLocaleString('en-IN')} record(s) found.
      </p>
    </div>
  )
}
