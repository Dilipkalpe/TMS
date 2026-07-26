import { Pencil, Printer, Trash2 } from 'lucide-react'

function actionColumnWidth(onPrint, onEdit, onDelete) {
  const n = [onPrint, onEdit, onDelete].filter(Boolean).length
  if (n >= 3) return 'w-[7.5rem]'
  if (n === 2) return 'w-[5.25rem]'
  if (n === 1) return 'w-10'
  return 'w-0'
}

function cellTitle(col, row) {
  if (col.render) return undefined
  const v = row[col.key]
  if (v == null || v === '') return undefined
  return String(v)
}

export default function ERPDataTable({
  columns,
  data,
  page = 1,
  pageSize = 25,
  showSerial = true,
  showActions = true,
  onPrint,
  onEdit,
  onDelete,
  onRowClick,
  sticky = true,
  fill = false,
  sortKey,
  sortDir = 'desc',
  printTitle = 'Print',
  emptyMessage = 'No records found.',
}) {
  const start = (page - 1) * pageSize
  const rows = data.slice(start, start + pageSize)
  const cellPad = 'px-2 py-1.5 sm:px-2.5 sm:py-2'
  const hasActionColumn = showActions && (onPrint || onEdit || onDelete)
  const actionWidth = actionColumnWidth(onPrint, onEdit, onDelete)

  const allColumns = [
    ...(showSerial ? [{ key: '__sr', label: 'Sr.', width: 'w-10', nowrap: true }] : []),
    ...(hasActionColumn ? [{ key: '__action', label: 'Action', width: actionWidth, nowrap: true }] : []),
    ...columns,
  ]

  return (
    <div className={fill ? 'scroll-hint-x flex min-h-0 flex-1 flex-col overflow-visible lg:overflow-hidden' : 'report-table-shell scroll-hint-x'}>
      <div
        className={`mobile-scroll-x mobile-scroll-y overflow-auto ${
          fill ? 'erp-list-table-scroll min-h-0 flex-1 report-table-scroll' : 'report-table-scroll'
        }`}
      >
        {/* table-auto + min-w-max: content-sized columns; scroll instead of crushing/overlapping */}
        <table className="w-max min-w-full border-collapse text-left text-xs sm:text-sm">
          <thead className={sticky ? 'sticky top-0 z-10' : ''}>
            <tr className="border border-primary/30 bg-primary text-white">
              {allColumns.map((col) => (
                <th
                  key={col.key}
                  className={`border border-primary/20 ${cellPad} whitespace-nowrap text-xs font-semibold ${col.width ?? ''}`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={allColumns.length}
                  className={`border border-primary/10 ${cellPad} py-8 text-center text-slate-500`}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id ?? row.lrNumber ?? start + i}
                  onClick={() => onRowClick?.(row)}
                  className={`border border-primary/15 transition-colors ${
                    i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/40 dark:bg-blue-950/20'
                  } hover:bg-blue-100/50 dark:hover:bg-blue-900/30 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {allColumns.map((col) => {
                    if (col.key === '__sr') {
                      return (
                        <td key={col.key} className={`border border-primary/10 ${cellPad} whitespace-nowrap text-slate-600`}>
                          {start + i + 1}
                        </td>
                      )
                    }
                    if (col.key === '__action') {
                      return (
                        <td key={col.key} className={`border border-primary/10 ${cellPad} whitespace-nowrap`}>
                          <div className="flex items-center justify-start gap-1" onClick={(e) => e.stopPropagation()}>
                            {onPrint && (
                              <button
                                type="button"
                                title={printTitle}
                                onClick={() => onPrint(row)}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-white hover:bg-primary-dark"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {onEdit && (
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => onEdit(row)}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-primary/40 bg-white text-primary hover:bg-primary/10 dark:bg-slate-800"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => onDelete(row)}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-red-300 bg-white text-red-500 hover:bg-red-50 dark:bg-slate-800"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )
                    }

                    // Default: nowrap + ellipsis so columns never overlap. Opt into wrap with nowrap:false.
                    const allowWrap = col.nowrap === false
                    const useEllipsis = !allowWrap && col.truncate !== false
                    const maxW = col.maxWidth ?? (useEllipsis ? 'max-w-[10rem]' : '')
                    return (
                      <td
                        key={col.key}
                        className={`border border-primary/10 ${cellPad} text-slate-700 dark:text-slate-300 ${
                          allowWrap ? 'whitespace-normal break-words' : 'whitespace-nowrap'
                        } ${useEllipsis ? `${maxW} overflow-hidden text-ellipsis` : ''} ${
                          col.align === 'right' ? 'text-right' : ''
                        } ${col.width ?? ''}`}
                        title={cellTitle(col, row)}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
