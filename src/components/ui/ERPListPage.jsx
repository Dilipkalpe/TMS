import { useMemo, useState } from 'react'
import ERPPageTitle from './ERPPageTitle'
import StatusSummaryCards from './StatusSummaryCards'
import ERPListToolbar from './ERPListToolbar'
import ERPDataTable from './ERPDataTable'
import TablePagination from './TablePagination'
import Modal from './Modal'
import Button from './Button'
import ImportModal from './ImportModal'
import { exportToCsv } from '../../utils/export'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import TablePrintFormat from '../print/TablePrintFormat'
import { formatPrintDate } from '../../utils/printUtils'

export default function ERPListPage({
  module,
  title,
  statusCards = [],
  addLabel,
  onAdd,
  showAdd = true,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  filterOptions = ['(All)'],
  filterKey,
  filterFn,
  columns = [],
  data = [],
  sortKey,
  defaultSortDir = 'desc',
  onRowClick,
  onPrint,
  onEdit,
  onDelete,
  showActions = true,
  rowPrintTitle = 'Print',
  showSerial = true,
  filterRow,
  pageSize: initialPageSize = 25,
  exportFilename,
  importTemplate = null,
  loading = false,
  error = null,
  onRefreshExternal,
  serverMode = false,
  serverTotal = 0,
  serverHasMore = false,
  totalIsApproximate = false,
  serverPage,
  onServerPageChange,
  serverPageSize,
  onServerPageSizeChange,
  onServerSearch,
  onServerFilter,
  searchValue: externalSearch,
  printable = true,
  printSubtitle,
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(filterOptions[0])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState([])
  const { toast } = useToast()
  const { company, print } = usePrint()

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColumns.includes(c.key)),
    [columns, hiddenColumns],
  )

  const activePage = serverMode ? (serverPage ?? 1) : page
  const activePageSize = serverMode ? (serverPageSize ?? pageSize) : pageSize

  const filtered = useMemo(() => {
    if (serverMode) return [...data]
    let rows = [...data]
    if (search.trim() && searchKeys.length) {
      const q = search.toLowerCase()
      rows = rows.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
      )
    }
    if (filter && filter !== '(All)' && filterKey) {
      rows = rows.filter((row) => row[filterKey] === filter)
    }
    if (filterFn) {
      rows = rows.filter((row) => filterFn(row, filter))
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (av < bv) return defaultSortDir === 'asc' ? -1 : 1
        if (av > bv) return defaultSortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return rows
  }, [data, search, filter, searchKeys, filterKey, filterFn, sortKey, defaultSortDir, serverMode])

  const recordCount = serverMode ? serverTotal : filtered.length
  const basePages = serverMode
    ? Math.max(1, Math.ceil(Math.max(serverTotal, 1) / activePageSize))
    : Math.max(1, Math.ceil(filtered.length / pageSize))
  const totalPages = serverMode && serverHasMore
    ? Math.max(basePages, activePage + 1)
    : basePages
  const safePage = Math.min(activePage, totalPages)

  const handleSearch = (v) => {
    if (serverMode) {
      onServerSearch?.(v)
    } else {
      setSearch(v)
      setPage(1)
    }
  }

  const handleFilter = (v) => {
    if (serverMode) {
      onServerFilter?.(v)
    } else {
      setFilter(v)
      setPage(1)
    }
  }

  const handlePageSize = (size) => {
    if (serverMode) {
      onServerPageSizeChange?.(size)
    } else {
      setPageSize(size)
      setPage(1)
    }
  }

  const handlePageChange = (p) => {
    if (serverMode) onServerPageChange?.(p)
    else setPage(p)
  }

  const handleRefresh = () => {
    if (!serverMode) {
      setSearch('')
      setFilter(filterOptions[0])
      setPage(1)
    }
    onRefreshExternal?.()
    toast({ title: 'List refreshed', message: `${recordCount} records loaded`, type: 'info' })
  }

  const handleExport = () => {
    const ok = exportToCsv(filtered, visibleColumns, exportFilename ?? `${module?.toLowerCase() ?? 'data'}-export.csv`)
    if (ok) {
      toast({ title: 'Export complete', message: `${filtered.length} rows exported to CSV`, type: 'success' })
    } else {
      toast({ title: 'Nothing to export', message: 'No records match current filters', type: 'warning' })
    }
  }

  const handlePrintList = () => {
    if (!filtered.length) {
      toast({ title: 'Nothing to print', message: 'No records match current filters', type: 'warning' })
      return
    }
    print(
      <TablePrintFormat
        company={company}
        documentTitle={title}
        documentSubtitle={printSubtitle ?? `${module ?? 'Report'} · Printed ${formatPrintDate(new Date())}`}
        columns={visibleColumns}
        rows={filtered}
        summary={`${filtered.length.toLocaleString('en-IN')} record(s)`}
      />,
    )
  }

  const handleRowPrint = onPrint ?? undefined

  const toggleColumn = (key) => {
    setHiddenColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  return (
    <div className="erp-list-page">
      <ERPPageTitle module={module} title={title} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-primary/20 bg-white shadow-sm dark:bg-slate-900">
        {statusCards.length > 0 && (
          <div className="shrink-0 border-x border-primary/20 p-2 sm:p-3">
            <StatusSummaryCards cards={statusCards} />
          </div>
        )}

        <div className="shrink-0">
        <ERPListToolbar
          addLabel={addLabel}
          onAdd={onAdd}
          showAdd={showAdd}
          searchValue={serverMode ? (externalSearch ?? '') : search}
          onSearchChange={handleSearch}
          searchPlaceholder={searchPlaceholder}
          filterValue={filter}
          onFilterChange={handleFilter}
          filterOptions={filterOptions}
          onRefresh={handleRefresh}
          onManageColumns={() => setColumnsOpen(true)}
          onExport={handleExport}
          onImport={importTemplate ? () => setImportOpen(true) : undefined}
          onPrint={printable ? handlePrintList : undefined}
          recordCount={recordCount}
          extra={filterRow}
        />
        </div>

        {error && (
          <div className="border-x border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-x border-primary/20">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/70">
              <span className="text-sm text-slate-500">Loading records…</span>
            </div>
          )}
          <ERPDataTable
            fill
            columns={visibleColumns}
            data={filtered}
            page={serverMode ? 1 : safePage}
            pageSize={serverMode ? filtered.length || activePageSize : pageSize}
            showSerial={showSerial}
            showActions={showActions}
            onRowClick={onRowClick}
            onPrint={handleRowPrint}
            onEdit={onEdit}
            onDelete={onDelete}
            printTitle={rowPrintTitle}
            sortKey={sortKey}
            sortDir={defaultSortDir}
          />
        </div>

        <TablePagination
          page={safePage}
          totalPages={totalPages}
          totalRecords={recordCount}
          pageSize={activePageSize}
          hasMore={serverMode && serverHasMore}
          totalIsApproximate={totalIsApproximate}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSize}
        />
      </div>

      <Modal
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        title="Manage Columns"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => setHiddenColumns([])}>Show all</Button>
            <Button size="sm" onClick={() => setColumnsOpen(false)}>Done</Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">Toggle column visibility for this list view.</p>
        <div className="space-y-2">
          {columns.map((col) => (
            <label key={col.key} className="flex cursor-pointer items-center space-x-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
              <input
                type="checkbox"
                checked={!hiddenColumns.includes(col.key)}
                onChange={() => toggleColumn(col.key)}
                className="h-4 w-4 rounded text-primary"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">{col.label}</span>
            </label>
          ))}
        </div>
      </Modal>

      {importTemplate && (
        <ImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          template={importTemplate}
          onComplete={() => {
            onRefreshExternal?.()
            toast({ title: 'Import finished', message: 'List refreshed with imported records', type: 'success' })
          }}
        />
      )}
    </div>
  )
}
