import { useMemo, useState } from 'react'
import TableRowActions, { buildStandardRowActions } from './TableRowActions'

const RESERVED_KEYS = new Set(['__select', '__sr', '__action', 'actions'])

function cellTitle(col, row) {
  if (col.render) return undefined
  const v = row[col.key]
  if (v == null || v === '') return undefined
  return String(v)
}

function actionColumnWidth(count) {
  if (count >= 4) return 'w-[8.5rem]'
  if (count === 3) return 'w-[6.5rem]'
  if (count === 2) return 'w-[4.75rem]'
  if (count === 1) return 'w-12'
  return 'w-0'
}

export default function ERPDataTable({
  columns,
  data,
  page = 1,
  pageSize = 25,
  showSerial = true,
  showActions = true,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  getRowKey = (row, index) => row.id ?? row.lrNumber ?? String(index),
  onView,
  onPrint,
  onEdit,
  onDelete,
  rowActions,
  canView,
  canEdit,
  canDelete,
  canPrint,
  onRowClick,
  sticky = true,
  fill = false,
  sortKey,
  sortDir = 'desc',
  printTitle = 'Print',
  emptyMessage = 'No records found.',
}) {
  const [internalSelected, setInternalSelected] = useState(() => new Set())
  const resolvedSelectedKeys = selectedKeys ?? internalSelected
  const resolvedOnSelectionChange = onSelectionChange ?? setInternalSelected

  const start = (page - 1) * pageSize
  const rows = data.slice(start, start + pageSize)
  /* Compact row density — aim for ~10–12 visible rows without vertical scroll */
  const cellPad = 'px-1.5 py-1 sm:px-2 sm:py-1'

  const dataColumns = useMemo(
    () => columns.filter((c) => !RESERVED_KEYS.has(c.key)),
    [columns],
  )

  const resolveActionsForRow = (row) => {
    if (typeof rowActions === 'function') return rowActions(row)
    if (rowActions?.length) return rowActions
    return buildStandardRowActions({
      onView,
      onEdit,
      onDelete,
      onPrint,
      printTitle,
      canView,
      canEdit,
      canDelete,
      canPrint,
    })
  }

  const sampleRow = rows[0]
  const sampleActions = sampleRow ? resolveActionsForRow(sampleRow) : (typeof rowActions === 'function' ? [] : (rowActions ?? buildStandardRowActions({ onView, onEdit, onDelete, onPrint, printTitle, canView, canEdit, canDelete, canPrint })))
  const visibleActionCount = sampleRow
    ? sampleActions.filter((a) => !a.hidden?.(sampleRow) && !a.disabled?.(sampleRow)).length
    : sampleActions.length
  const hasActionColumn = showActions && visibleActionCount > 0
  const actionWidth = actionColumnWidth(visibleActionCount)

  const pageRowKeys = rows.map((row, i) => getRowKey(row, start + i))
  const allPageSelected = pageRowKeys.length > 0 && pageRowKeys.every((k) => resolvedSelectedKeys?.has?.(k))
  const somePageSelected = pageRowKeys.some((k) => resolvedSelectedKeys?.has?.(k))

  const toggleRow = (key) => {
    if (!resolvedOnSelectionChange || !resolvedSelectedKeys) return
    const next = new Set(resolvedSelectedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    resolvedOnSelectionChange(next)
  }

  const toggleAllOnPage = () => {
    if (!resolvedOnSelectionChange || !resolvedSelectedKeys) return
    const next = new Set(resolvedSelectedKeys)
    if (allPageSelected) pageRowKeys.forEach((k) => next.delete(k))
    else pageRowKeys.forEach((k) => next.add(k))
    resolvedOnSelectionChange(next)
  }

  const allColumns = [
    ...(selectable ? [{ key: '__select', label: '', width: 'w-10', nowrap: true }] : []),
    ...(showSerial ? [{ key: '__sr', label: 'Sr.', width: 'w-10', nowrap: true }] : []),
    ...(hasActionColumn ? [{ key: '__action', label: 'Action', width: actionWidth, nowrap: true }] : []),
    ...dataColumns,
  ]

  return (
    <div className={fill ? 'scroll-hint-x flex min-h-0 flex-1 flex-col overflow-visible lg:overflow-hidden' : 'report-table-shell scroll-hint-x'}>
      <div
        className={`mobile-scroll-x mobile-scroll-y overflow-auto ${
          fill ? 'erp-list-table-scroll min-h-0 flex-1 report-table-scroll' : 'report-table-scroll'
        }`}
      >
        <table className="erp-data-table w-max min-w-full border-collapse text-left text-xs">
          <thead className={sticky ? 'sticky top-0 z-10' : ''}>
            <tr className="border border-primary/30 bg-primary text-white">
              {allColumns.map((col) => (
                <th
                  key={col.key}
                  className={`border border-primary/20 ${cellPad} whitespace-nowrap text-[11px] font-semibold leading-tight ${col.width ?? ''}`}
                >
                  {col.key === '__select' ? (
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => { if (el) el.indeterminate = !allPageSelected && somePageSelected }}
                      onChange={toggleAllOnPage}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-white/50 accent-white"
                      title="Select all on this page"
                      aria-label="Select all on this page"
                    />
                  ) : (
                    col.label
                  )}
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
                  className={`border border-primary/10 ${cellPad} py-6 text-center text-slate-500`}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const rowKey = getRowKey(row, start + i)
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    className={`border border-primary/15 transition-colors ${
                      i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/40 dark:bg-blue-950/20'
                    } hover:bg-blue-100/50 dark:hover:bg-blue-900/30 ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {allColumns.map((col) => {
                      if (col.key === '__select') {
                        return (
                          <td key={col.key} className={`border border-primary/10 ${cellPad} whitespace-nowrap`}>
                            <input
                              type="checkbox"
                              checked={resolvedSelectedKeys?.has?.(rowKey) ?? false}
                              onChange={() => toggleRow(rowKey)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 accent-primary"
                              aria-label={`Select row ${rowKey}`}
                            />
                          </td>
                        )
                      }
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
                            <TableRowActions actions={resolveActionsForRow(row)} row={row} />
                          </td>
                        )
                      }

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
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
