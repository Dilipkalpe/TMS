import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPListPage from '../ui/ERPListPage'
import ERPPageTitle from '../ui/ERPPageTitle'
import Badge from '../ui/Badge'
import OpsListActionBar from './OpsListActionBar'
import LrListKpiCards from '../lr/LrListKpiCards'
import LrListTableToolbar from '../lr/LrListTableToolbar'
import SlideDrawer from '../ui/SlideDrawer'
import Input, { Select } from '../ui/Input'
import Button from '../ui/Button'
import KeyboardShortcutBar, { TRANSIT_PASS_SHORTCUTS } from '../keyboard/KeyboardShortcutBar'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { useKeyboardPageActions } from '../../hooks/useKeyboardPageActions'
import { operationsModulesApi } from '../../services/api'
import { TRANSIT_PASS_COLUMNS, MODULE_KPI_MAP } from '../../config/tmsModules'
import { exportToCsv } from '../../utils/export'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { printModuleList } from '../../services/printService'
import { printGridRowDocument } from '../../utils/printGridDocument'
import { PRINT_MODULE_CODES } from '../../config/printModules'

const KPI_ICONS = {
  total: 'FileText',
  active: 'Activity',
  completed: 'CheckCircle2',
  cancelled: 'XCircle',
  today: 'Calendar',
}

const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  passNo: '',
  lrNo: '',
  tripNo: '',
  branch: '',
  fromBranch: '',
  toBranch: '',
  vehicle: '',
  driver: '',
  status: '(All)',
}

function countActiveFilters(f) {
  return Object.entries(f).filter(([, v]) => v && v !== '(All)').length
}

function badgeVariant(label) {
  const s = String(label || '').toLowerCase()
  if (s.includes('completed')) return 'Paid'
  if (s.includes('active')) return 'info'
  if (s.includes('cancel')) return 'Cancelled'
  if (s.includes('pending')) return 'Pending'
  return 'outline'
}

function formatDate(val) {
  if (!val) return '—'
  if (typeof val === 'string' && val.includes('T')) return val.slice(0, 16).replace('T', ' ')
  return String(val)
}

function mapRow(r) {
  return {
    ...r,
    passDate: formatDate(r.passDate),
    validFrom: formatDate(r.validFrom),
    validTo: formatDate(r.validTo),
  }
}

function pct(part, total) {
  if (!total) return null
  return `${((part / total) * 100).toFixed(2)}%`
}

export default function TransitPassListPageContent() {
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
      if (appliedFilters.status !== '(All)') params.status = appliedFilters.status
      const extra = [
        appliedFilters.passNo, appliedFilters.lrNo, appliedFilters.tripNo,
        appliedFilters.branch, appliedFilters.fromBranch, appliedFilters.toBranch,
        appliedFilters.vehicle, appliedFilters.driver,
      ].filter(Boolean).join(' ')
      if (extra) params.search = [params.search, extra].filter(Boolean).join(' ')
      return operationsModulesApi.list('transit-passes', params)
    },
    [appliedFilters],
  )

  const reloadSummary = useCallback(() => {
    operationsModulesApi.summary('transit-passes').then(setSummary).catch(() => {})
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
    navigate(`/operations/transit-pass?lr=${encodeURIComponent(row.lrNumber)}`)
  }, [navigate])

  const rows = useMemo(() => paged.items.map(mapRow), [paged.items])

  const total = summary.total ?? 0
  const kpiCards = useMemo(() => (MODULE_KPI_MAP['transit-passes'] || []).map((k) => {
    const count = summary[k.field] ?? 0
    let subtitle = k.subtitle
    if (!subtitle && k.field !== 'total' && total > 0) {
      subtitle = pct(count, total)
    }
    return {
      label: k.label,
      count,
      icon: KPI_ICONS[k.field] || 'Layers',
      color: k.color === 'cyan' ? 'teal' : k.color,
      subtitle,
    }
  }), [summary, total])

  const tableColumns = useMemo(() => TRANSIT_PASS_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    render: (r) => {
      const val = r[col.key]
      if (col.badge) return <Badge variant={badgeVariant(val)}>{val || '—'}</Badge>
      if (col.key === 'passNumber' || col.key === 'lrNumber' || col.key === 'tripNo') {
        return (
          <button type="button" className="font-semibold text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openRow(r) }}>
            {val || '—'}
          </button>
        )
      }
      return val ?? '—'
    },
  })), [openRow])

  const handleExport = () => {
    const ok = exportToCsv(rows, TRANSIT_PASS_COLUMNS, 'transit-pass-list.csv')
    toast({ title: ok ? 'Export complete' : 'Nothing to export', type: ok ? 'success' : 'warning' })
  }

  const handlePrintRow = useCallback(async (row) => {
    await printGridRowDocument({
      moduleCode: PRINT_MODULE_CODES.TRANSIT_PASS,
      row,
      company,
      print,
      toast,
    })
  }, [company, print, toast])
  const handlePrintList = () => {
    printModuleList({
      moduleCode: PRINT_MODULE_CODES.TRANSIT_PASS,
      company,
      print,
      toast,
      columns: TRANSIT_PASS_COLUMNS,
      rows,
      documentTitle: 'Transit Pass List',
      summary: `${paged.total.toLocaleString('en-IN')} record(s)`,
    })
  }

  useKeyboardPageActions({
    onNewF2: () => navigate('/operations/transit-pass'),
    onSearch: openFilterDrawer,
    onPrint: handlePrintList,
    onPreview: refreshList,
    onCancel: () => setFilterOpen(false),
  }, [rows, paged.items])

  const activeFilterCount = countActiveFilters(appliedFilters)

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
        title="Transit Pass List"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Transit Pass', path: '/operations/transit-pass/list' },
          { label: 'Transit Pass List' },
        ]}
      />
      <div className="transit-pass-list-page flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2 sm:p-3">
          <OpsListActionBar
            newLabel="New Transit Pass"
            activeFilterCount={activeFilterCount}
            onNew={() => navigate('/operations/transit-pass')}
            onSearch={openFilterDrawer}
            onFilter={openFilterDrawer}
            onExport={handleExport}
            onPrint={handlePrintList}
            onManageColumns={() => setColumnsSignal((n) => n + 1)}
            onRefresh={refreshList}
          />
          <LrListKpiCards cards={kpiCards} />
          <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Transit Pass" width="md">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Date From" type="date" value={draftFilters.dateFrom} onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
              <Input label="Date To" type="date" value={draftFilters.dateTo} onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))} />
              <Input label="Transit Pass No." value={draftFilters.passNo} onChange={(e) => setDraftFilters((f) => ({ ...f, passNo: e.target.value }))} />
              <Input label="LR No." value={draftFilters.lrNo} onChange={(e) => setDraftFilters((f) => ({ ...f, lrNo: e.target.value }))} />
              <Input label="Trip No." value={draftFilters.tripNo} onChange={(e) => setDraftFilters((f) => ({ ...f, tripNo: e.target.value }))} />
              <Input label="Branch" value={draftFilters.branch} onChange={(e) => setDraftFilters((f) => ({ ...f, branch: e.target.value }))} />
              <Input label="From Branch / Location" value={draftFilters.fromBranch} onChange={(e) => setDraftFilters((f) => ({ ...f, fromBranch: e.target.value }))} />
              <Input label="To Branch / Location" value={draftFilters.toBranch} onChange={(e) => setDraftFilters((f) => ({ ...f, toBranch: e.target.value }))} />
              <Input label="Vehicle No." value={draftFilters.vehicle} onChange={(e) => setDraftFilters((f) => ({ ...f, vehicle: e.target.value }))} />
              <Input label="Driver" value={draftFilters.driver} onChange={(e) => setDraftFilters((f) => ({ ...f, driver: e.target.value }))} />
              <Select label="Status" options={['(All)', 'Active', 'Completed', 'Cancelled']} value={draftFilters.status} onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))} />
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
            onPrint={handlePrintRow}
            rowPrintTitle="Print Transit Pass"
            exportFilename="transit-pass-list"
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
        <KeyboardShortcutBar shortcuts={TRANSIT_PASS_SHORTCUTS} />
      </div>
    </div>
  )
}
