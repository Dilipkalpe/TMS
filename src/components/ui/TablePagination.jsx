import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Select } from './Input'

export default function TablePagination({
  page,
  totalPages,
  totalRecords,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  hasMore = false,
  totalIsApproximate = false,
  onPageChange,
  onPageSizeChange,
}) {
  const btnClass =
    'inline-flex h-8 w-8 items-center justify-center rounded border border-primary/30 bg-white text-primary transition-colors hover:bg-primary/10 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400'

  const atLastPage = page >= totalPages && !hasMore

  return (
    <div className="flex shrink-0 flex-col gap-2 border border-t-0 border-primary/20 bg-slate-50 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-3 dark:bg-slate-800/50">
      <p className="text-xs text-slate-600 sm:text-sm dark:text-slate-400">
        Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{' '}
        <span className="font-semibold">{hasMore && page >= totalPages ? `${totalPages}+` : totalPages}</span>
        <span className="mx-2 hidden sm:inline">•</span>
        <span className="hidden sm:inline">
          {totalIsApproximate ? '~' : ''}{totalRecords.toLocaleString('en-IN')} records
        </span>
        <span className="mx-2 hidden sm:inline">•</span>
        <span className="hidden sm:inline">{pageSize} per page</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 sm:text-sm">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="rounded border border-primary/30 bg-white px-2 py-1 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={btnClass} disabled={page <= 1} onClick={() => onPageChange(1)}>
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button type="button" className={btnClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[4rem] text-center text-xs font-medium sm:text-sm">
            {page} / {hasMore && page >= totalPages ? `${totalPages}+` : totalPages}
          </span>
          <button type="button" className={btnClass} disabled={atLastPage} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className={btnClass} disabled={atLastPage} onClick={() => onPageChange(totalPages)}>
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
