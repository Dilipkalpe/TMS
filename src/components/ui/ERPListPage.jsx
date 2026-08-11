import { useMemo, useState, useEffect } from 'react'
import ERPPageTitle from './ERPPageTitle'
import StatusSummaryCards from './StatusSummaryCards'
import ERPListToolbar from './ERPListToolbar'
import ERPDataTable from './ERPDataTable'
import TablePagination from './TablePagination'
import Modal from './Modal'
import SlideDrawer from './SlideDrawer'
import Button from './Button'
import ImportModal from './ImportModal'
import { exportToCsv } from '../../utils/export'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import TablePrintFormat from '../print/TablePrintFormat'
import { formatPrintDate } from '../../utils/printUtils'
import { printModuleList } from '../../services/printService'

export default function ERPListPage({
  module,
  title,
  statusCards = [],
  headerBanner = null,
  addLabel,
  onAdd,
  showAdd = true,
  secondaryAddLabel,
  onSecondaryAdd,
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
  onView,
  onPrint,
  onEdit,
  onDelete,
  rowActions,
  canView,
  canEdit,
  canDelete,
  canPrint,
  showActions = true,
  selectable = true,
  selectedKeys: controlledSelectedKeys,
  onSelectionChange,
  getRowKey,
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
  printModuleCode = null,
  addPosition = 'start',
  hideToolbar = false,
  openColumnsSignal = 0,
  tableToolbar = null,
  listVariant = 'default',
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(filterOptions[0])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState([])
  const [internalSelected, setInternalSelected] = useState(() => new Set())
  const { toast } = useToast()
  const { company, print } = usePrint()

  useEffect(() => {
    if (openColumnsSignal > 0) setColumnsOpen(true)
  }, [openColumnsSignal])

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColumns.includes(c.key)),
    [columns, hiddenColumns],
  )

  const manageableColumns = useMemo(
    () => columns.filter((c) => !c.key.startsWith('__') && c.key !== 'actions'),
    [columns],
  )

  const selectedKeys = controlledSelectedKeys ?? internalSelected
  const handleSelectionChange = onSelectionChange ?? setInternalSelected
  const resolvedGetRowKey = getRowKey ?? ((row) => row.id ?? row.lrNumber ?? row.username ?? row.code)

  const getColumnLabel = (col) => (typeof col.label === 'string' ? col.label : col.key)

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

  const handlePrintList = async () => {
    if (!filtered.length) {
      toast({ title: 'Nothing to print', message: 'No records match current filters', type: 'warning' })
      return
    }
    if (printModuleCode) {
      await printModuleList({
        moduleCode: printModuleCode,
        company,
        print,
        toast,
        columns: visibleColumns,
        rows: filtered,
        documentTitle: title,
        documentSubtitle: printSubtitle ?? `${module ?? 'Report'} · Printed ${formatPrintDate(new Date())}`,
        summary: `${filtered.length.toLocaleString('en-IN')} record(s)`,
      })
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
  const resolvedOnView = onView ?? onRowClick

  const toggleColumn = (key) => {
    setHiddenColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  return (
    <div className="erp-list-page min-h-0 h-auto lg:h-full">
      {title ? <ERPPageTitle module={module} title={title} /> : null}

      <div className={`erp-list-card flex min-h-0 flex-1 flex-col overflow-visible rounded-lg border bg-white shadow-sm lg:overflow-hidden dark:bg-slate-900 ${
        listVariant === 'lr' ? 'border-slate-200 dark:border-slate-700' : 'border-primary/20'
      }`}>
        {headerBanner ? (
          <div className="erp-list-kpi-wrap shrink-0 border-x border-primary/20 px-2 py-1.5 sm:px-3 sm:py-2">
            {headerBanner}
          </div>
        ) : statusCards.length > 0 ? (
          <div className="erp-list-kpi-wrap shrink-0 border-x border-primary/20 px-2 py-1.5 sm:px-3 sm:py-2">
            <StatusSummaryCards cards={statusCards} />
          </div>
        ) : null}

        <div className="shrink-0">
        {hideToolbar ? (
          filterRow ? <div className="border-x border-primary/20 bg-white px-2 py-2 sm:px-3 dark:bg-slate-900">{filterRow}</div> : null
        ) : (
        <ERPListToolbar
          addLabel={addLabel}
          onAdd={onAdd}
          showAdd={showAdd}
          secondaryAddLabel={secondaryAddLabel}
          onSecondaryAdd={onSecondaryAdd}
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
          addPosition={addPosition}
        />
        )}
        </div>

        {error && (
          <div className="border-x border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {tableToolbar ? <div className="shrink-0">{tableToolbar}</div> : null}

        <div className="erp-list-table-region relative flex min-h-0 flex-1 flex-col overflow-visible border-x border-primary/20 lg:overflow-hidden">
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
            selectable={selectable}
            selectedKeys={selectedKeys}
            onSelectionChange={handleSelectionChange}
            getRowKey={resolvedGetRowKey}
            onRowClick={onRowClick}
            onView={resolvedOnView}
            onPrint={handleRowPrint}
            onEdit={onEdit}
            onDelete={onDelete}
            rowActions={rowActions}
            canView={canView}
            canEdit={canEdit}
            canDelete={canDelete}
            canPrint={canPrint}
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
          showingFrom={serverMode ? ((safePage - 1) * activePageSize) + (filtered.length ? 1 : 0) : undefined}
          showingTo={serverMode ? ((safePage - 1) * activePageSize) + filtered.length : undefined}
          hidePageSizeSelector={Boolean(tableToolbar)}
        />
      </div>

      {listVariant === 'lr' ? (
        <SlideDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} title="Manage Columns" width="sm">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Toggle column visibility for the LR list grid.
          </p>
          <div className="space-y-2">
            {manageableColumns.map((col) => (
              <label key={col.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={!hiddenColumns.includes(col.key)}
                  onChange={() => toggleColumn(col.key)}
                  className="h-4 w-4 rounded text-primary"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{getColumnLabel(col)}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <Button variant="outline" size="sm" onClick={() => setHiddenColumns([])}>Show all</Button>
            <Button size="sm" onClick={() => setColumnsOpen(false)}>Done</Button>
          </div>
        </SlideDrawer>
      ) : (
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
          {manageableColumns.map((col) => (
            <label key={col.key} className="flex cursor-pointer items-center space-x-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
              <input
                type="checkbox"
                checked={!hiddenColumns.includes(col.key)}
                onChange={() => toggleColumn(col.key)}
                className="h-4 w-4 rounded text-primary"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">{getColumnLabel(col)}</span>
            </label>
          ))}
        </div>
      </Modal>
      )}

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
