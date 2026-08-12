import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, Send } from 'lucide-react'
import ERPListPage from '../ui/ERPListPage'
import ERPPageTitle from '../ui/ERPPageTitle'
import Badge from '../ui/Badge'
import OpsListActionBar from './OpsListActionBar'
import LrListKpiCards from '../lr/LrListKpiCards'
import LrListTableToolbar from '../lr/LrListTableToolbar'
import SlideDrawer from '../ui/SlideDrawer'
import Input from '../ui/Input'
import Button from '../ui/Button'
import KeyboardShortcutBar, { DISPATCH_SHORTCUTS } from '../keyboard/KeyboardShortcutBar'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { useKeyboardPageActions } from '../../hooks/useKeyboardPageActions'
import { operationsModulesApi } from '../../services/api'
import { DISPATCH_COLUMNS, MODULE_KPI_MAP } from '../../config/tmsModules'
import { exportToCsv } from '../../utils/export'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { printModuleList } from '../../services/printService'
import { printGridRowDocument } from '../../utils/printGridDocument'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { statusBadgeVariant } from '../../utils/opsWorkflowUtils'

const KPI_ICONS = { total: 'Send', pending: 'Clock', todayDispatched: 'Calendar', inTransit: 'Truck', cancelled: 'XCircle' }
const EMPTY_FILTERS = { dateFrom: '', dateTo: '', transitPassNo: '', lrNo: '', vehicle: '', driver: '' }

function countActiveFilters(f) {
  return Object.entries(f).filter(([, v]) => v).length
}

export default function DispatchListPageContent() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [summary, setSummary] = useState({})
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [columnsSignal, setColumnsSignal] = useState(0)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => {
      const params = buildListParams({ page, pageSize, search })
      if (appliedFilters.dateFrom) params.dateFrom = appliedFilters.dateFrom
      if (appliedFilters.dateTo) params.dateTo = appliedFilters.dateTo
      const extra = [appliedFilters.transitPassNo, appliedFilters.lrNo, appliedFilters.vehicle, appliedFilters.driver].filter(Boolean).join(' ')
      if (extra) params.search = [params.search, extra].filter(Boolean).join(' ')
      return operationsModulesApi.list('dispatch', params)
    },
    [appliedFilters],
  )

  const reloadSummary = useCallback(() => {
    operationsModulesApi.summary('dispatch').then(setSummary).catch(() => {})
  }, [])

  useEffect(() => { reloadSummary() }, [paged.items.length, reloadSummary])

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters })
    paged.setPage(1)
    setFilterOpen(false)
  }, [draftFilters, paged])

  const clearFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    paged.setPage(1)
    setFilterOpen(false)
  }, [paged])

  const openFilterDrawer = useCallback(() => {
    setDraftFilters({ ...appliedFilters })
    setFilterOpen(true)
  }, [appliedFilters])

  const refreshList = useCallback(() => {
    paged.refresh()
    reloadSummary()
  }, [paged, reloadSummary])

  const openRow = useCallback((row) => {
    if (!row?.lrNumber) return
    navigate(`/operations/dispatch?lr=${encodeURIComponent(row.lrNumber)}`)
  }, [navigate])

  const rows = useMemo(() => paged.items.map((r) => ({ ...r, status: r.status || 'Dispatched' })), [paged.items])

  const kpiCards = useMemo(() => (MODULE_KPI_MAP.dispatch || []).map((k) => ({
    label: k.label,
    count: summary[k.field] ?? 0,
    icon: KPI_ICONS[k.field] || 'Layers',
    color: k.color === 'cyan' ? 'teal' : k.color,
  })), [summary])

  const tableColumns = useMemo(() => DISPATCH_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    render: (r) => {
      const val = r[col.key]
      if (col.badge) return <Badge variant={statusBadgeVariant(val)}>{val || '—'}</Badge>
      if (['transitPassNo', 'lrNumber', 'dispatchNo'].includes(col.key)) {
        return (
          <button type="button" className="font-semibold text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openRow(r) }}>
            {val || r.transitPassNo || r.lrNumber || '—'}
          </button>
        )
      }
      return val ?? '—'
    },
  })), [openRow])

  const handleExport = () => exportToCsv(rows, DISPATCH_COLUMNS, 'dispatch-list.csv')

  const handlePrintList = useCallback(async () => {
    await printModuleList({
      moduleCode: PRINT_MODULE_CODES.DISPATCH,
      company,
      print,
      toast,
      columns: DISPATCH_COLUMNS,
      rows,
      documentTitle: 'Dispatch List',
      summary: `${paged.total.toLocaleString('en-IN')} record(s)`,
    })
  }, [rows, paged.total, company, print, toast])

  useKeyboardPageActions({
    onNewF2: () => navigate('/operations/dispatch'),
    onSearch: openFilterDrawer,
    onPrint: handlePrintList,
    onPreview: refreshList,
    onCancel: () => setFilterOpen(false),
  }, [rows, paged.items])

  const handlePrintRow = useCallback(async (row) => {
    await printGridRowDocument({
      moduleCode: PRINT_MODULE_CODES.DISPATCH,
      row,
      company,
      print,
      toast,
    })
  }, [company, print, toast])

  const rowActions = useMemo(() => [
    { id: 'dispatch', icon: Send, label: 'Dispatch', onClick: openRow, variant: 'primary' },
    { id: 'print', icon: Printer, label: 'Print Dispatch', onClick: handlePrintRow, variant: 'primary' },
  ], [openRow, handlePrintRow])

  const columns = useMemo(() => tableColumns, [tableColumns])

  const tableToolbar = (
    <LrListTableToolbar
      pageSize={paged.pageSize}
      onPageSizeChange={paged.setPageSize}
      totalRecords={paged.total}
      onExportExcel={handleExport}
      onExportPdf={handlePrintList}
      onManageColumns={() => setColumnsSignal((n) => n + 1)}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="Dispatch List"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Dispatch', path: '/operations/dispatch/list' },
          { label: 'Dispatch List' },
        ]}
      />
      <div className="dispatch-list-page flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2 sm:p-3">
          <OpsListActionBar
            newLabel="New Dispatch"
            activeFilterCount={countActiveFilters(appliedFilters)}
            onNew={() => navigate('/operations/dispatch')}
            onSearch={openFilterDrawer}
            onFilter={openFilterDrawer}
            onExport={handleExport}
            onPrint={handlePrintList}
            onManageColumns={() => setColumnsSignal((n) => n + 1)}
            onRefresh={refreshList}
          />
          <LrListKpiCards cards={kpiCards} />
          <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Dispatch" width="md">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Date From" type="date" value={draftFilters.dateFrom} onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
              <Input label="Date To" type="date" value={draftFilters.dateTo} onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))} />
              <Input label="Transit Pass No." value={draftFilters.transitPassNo} onChange={(e) => setDraftFilters((f) => ({ ...f, transitPassNo: e.target.value }))} />
              <Input label="LR No." value={draftFilters.lrNo} onChange={(e) => setDraftFilters((f) => ({ ...f, lrNo: e.target.value }))} />
              <Input label="Vehicle" value={draftFilters.vehicle} onChange={(e) => setDraftFilters((f) => ({ ...f, vehicle: e.target.value }))} />
              <Input label="Driver" value={draftFilters.driver} onChange={(e) => setDraftFilters((f) => ({ ...f, driver: e.target.value }))} />
            </div>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <Button onClick={applyFilters}>Search</Button>
              <Button variant="outline" onClick={clearFilters}>Reset</Button>
            </div>
          </SlideDrawer>
          <ERPListPage
            module="Operations"
            listVariant="lr"
            hideToolbar
            showAdd={false}
            openColumnsSignal={columnsSignal}
            tableToolbar={tableToolbar}
            columns={columns}
            data={rows}
            loading={paged.loading}
            error={paged.error}
            onRefreshExternal={refreshList}
            onRowClick={openRow}
            onView={openRow}
            rowActions={rowActions}
            exportFilename="dispatch-list"
            serverMode
            serverTotal={paged.total}
            serverHasMore={paged.hasMore}
            totalIsApproximate={paged.totalIsApproximate}
            serverPage={paged.page}
            onServerPageChange={paged.setPage}
            serverPageSize={paged.pageSize}
            onServerPageSizeChange={paged.setPageSize}
            onServerSearch={paged.setSearch}
            searchValue={paged.search}
          />
        </div>
        <KeyboardShortcutBar shortcuts={DISPATCH_SHORTCUTS} />
      </div>
    </div>
  )
}
