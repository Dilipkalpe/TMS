import {
  ChevronDown,
  Columns3,
  Download,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react'
import Button from './Button'
import { Select } from './Input'

export default function ERPListToolbar({
  addLabel = 'Add New Record',
  onAdd,
  showAdd = true,
  secondaryAddLabel,
  onSecondaryAdd,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterValue,
  onFilterChange,
  filterOptions = ['(All)'],
  onRefresh,
  onManageColumns,
  onExport,
  onImport,
  onPrint,
  recordCount = 0,
  extra,
  addPosition = 'start',
}) {
  const addButton = showAdd && onAdd ? (
    <Button icon={Plus} onClick={onAdd} className="w-full sm:w-auto">
      {addLabel}
    </Button>
  ) : null

  const secondaryAddButton = onSecondaryAdd ? (
    <Button variant="outline" icon={Plus} onClick={onSecondaryAdd} className="w-full sm:w-auto">
      {secondaryAddLabel || 'Add Bulk'}
    </Button>
  ) : null

  return (
    <div className="erp-list-toolbar shrink-0 space-y-1.5 border-x border-primary/20 bg-white px-2 py-1.5 sm:px-3 sm:py-2 dark:bg-slate-900">
      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {addPosition === 'start' && addButton}
          {addPosition === 'start' && secondaryAddButton}
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-primary/30 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          {filterOptions.length > 0 && (
            <div className="w-full min-w-[120px] sm:w-36">
              <Select
                label={false}
                options={filterOptions}
                value={filterValue ?? filterOptions[0]}
                onChange={(e) => onFilterChange?.(e.target.value)}
                placeholder="Filter…"
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {addPosition === 'end' && addButton}
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRefresh} className="!px-2 sm:!px-3">
            <span className="hidden min-[400px]:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" icon={Columns3} onClick={onManageColumns} className="!px-2 sm:!px-3">
            <span className="hidden min-[400px]:inline sm:hidden">Cols</span>
            <span className="hidden sm:inline">Manage Columns</span>
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={onExport} className="!px-2 sm:!px-3">
            <span className="hidden min-[400px]:inline sm:hidden">Export</span>
            <span className="hidden sm:inline">Export Data</span>
            <ChevronDown className="hidden h-3.5 w-3.5 sm:inline" />
          </Button>
          {onImport && (
            <Button variant="outline" size="sm" icon={Upload} onClick={onImport}>
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
          )}
          {onPrint && (
            <Button variant="outline" size="sm" icon={Printer} onClick={onPrint}>
              Print
            </Button>
          )}
        </div>
      </div>
      {extra}
      <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
        {recordCount.toLocaleString('en-IN')} rows found
      </p>
    </div>
  )
}
