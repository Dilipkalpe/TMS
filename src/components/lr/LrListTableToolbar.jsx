import { FileSpreadsheet, FileText, Settings } from 'lucide-react'

export default function LrListTableToolbar({
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  totalRecords,
  onExportExcel,
  onExportPdf,
  onManageColumns,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium dark:border-slate-600 dark:bg-slate-800"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>entries</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
          <span>Quick Export :</span>
          <button type="button" onClick={onExportExcel} className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 font-medium text-green-700 hover:bg-green-100">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </button>
          <button type="button" onClick={onExportPdf} className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-700 hover:bg-red-100">
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
        <p className="text-xs font-medium text-slate-700 sm:text-sm dark:text-slate-300">
          Total Records : <span className="font-bold text-primary">{totalRecords.toLocaleString('en-IN')}</span>
        </p>
        <button
          type="button"
          onClick={onManageColumns}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
          aria-label="Table settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
