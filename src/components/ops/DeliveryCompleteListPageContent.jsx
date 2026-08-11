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
import KeyboardShortcutBar, { DELIVERY_COMPLETE_SHORTCUTS } from '../keyboard/KeyboardShortcutBar'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { useKeyboardPageActions } from '../../hooks/useKeyboardPageActions'
import { operationsModulesApi } from '../../services/api'
import { DELIVERY_COLUMNS, MODULE_KPI_MAP } from '../../config/tmsModules'
import { exportToCsv } from '../../utils/export'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { printModuleList } from '../../services/printService'
import { printGridRowDocument } from '../../utils/printGridDocument'
import { PRINT_MODULE_CODES } from '../../config/printModules'

const KPI_ICONS = {
  total: 'PackageCheck',
  today: 'Calendar',
  thisMonth: 'CalendarDays',
  pendingPod: 'Clock',
  pendingDelivery: 'Truck',
  avgDays: 'Timer',
}

const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  lrNo: '',
  tripNo: '',
  customer: '',
  branch: '',
  fromCity: '',
  toCity: '',
  deliveryDate: '',
  deliveryStatus: '(All)',
  podStatus: '(All)',
  vehicle: '',
  driver: '',
  deliveryType: '(All)',
}

function countActiveFilters(f) {
  return Object.entries(f).filter(([, v]) => v && v !== '(All)').length
}

function badgeVariant(label) {
  const s = String(label || '').toLowerCase()
  if (s.includes('delivered') || s.includes('received') || s.includes('verified') || s.includes('complete')) return 'Paid'
  if (s.includes('ready')) return 'info'
  if (s.includes('pending')) return 'Pending'
  return 'outline'
}

function formatDate(val) {
  if (!val) return '—'
  return String(val)
}

function formatTime(val) {
  if (!val) return '—'
  if (typeof val === 'string' && val.includes('T')) {
    const d = new Date(val)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  }
  return '—'
}

function mapRow(r) {
  return {
    ...r,
    vehicleNumber: r.vehicleNumber ?? r.tripNo ?? '—',
    driver: r.driver ?? '—',
    deliveryDate: formatDate(r.deliveryDate),
    deliveryTime: formatTime(r.receivedOn ?? r.deliveryTime),
    podRefNo: r.podRefNo ?? r.podNo ?? '—',
    deliveryStatus: r.deliveryStatus || 'Ready for Delivery',
    podStatus: r.podStatus || 'Pending',
  }
}

function pct(part, total) {
  if (!total) return null
  return `${((part / total) * 100).toFixed(2)}% of Total`
}

export default function DeliveryCompleteListPageContent() {
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
      if (appliedFilters.deliveryDate) params.dateFrom = appliedFilters.deliveryDate
      if (appliedFilters.deliveryStatus !== '(All)') params.status = appliedFilters.deliveryStatus
      if (appliedFilters.podStatus !== '(All)') params.status = appliedFilters.podStatus
      const extra = [
        appliedFilters.lrNo, appliedFilters.tripNo, appliedFilters.customer,
        appliedFilters.branch, appliedFilters.fromCity, appliedFilters.toCity,
        appliedFilters.vehicle, appliedFilters.driver,
      ].filter(Boolean).join(' ')
      if (extra) params.search = [params.search, extra].filter(Boolean).join(' ')
      return operationsModulesApi.list('delivery-complete', params)
    },
    [appliedFilters],
  )

  const reloadSummary = useCallback(() => {
    operationsModulesApi.summary('delivery-complete').then(setSummary).catch(() => {})
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
    navigate(`/operations/delivery-complete?lr=${encodeURIComponent(row.lrNumber)}`)
  }, [navigate])

  const rows = useMemo(() => paged.items.map(mapRow), [paged.items])
  const total = summary.total ?? 0

  const kpiCards = useMemo(() => (MODULE_KPI_MAP['delivery-complete'] || []).map((k) => {
    const raw = summary[k.field] ?? 0
    let count = raw
    if (k.field === 'avgDays') count = `${raw}${k.suffix ?? ''}`
    let subtitle = k.subtitle
    if (k.field === 'pendingPod' && total > 0) subtitle = pct(raw, total)
    return {
      label: k.label,
      count,
      icon: KPI_ICONS[k.field] || 'Layers',
      color: k.color === 'cyan' ? 'teal' : k.color,
      subtitle,
    }
  }), [summary, total])

  const tableColumns = useMemo(() => DELIVERY_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    render: (r) => {
      const val = r[col.key]
      if (col.badge) return <Badge variant={badgeVariant(val)}>{val || '—'}</Badge>
      if (col.key === 'lrNumber' || col.key === 'tripNo') {
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
    const ok = exportToCsv(rows, DELIVERY_COLUMNS, 'delivery-complete-list.csv')
    toast({ title: ok ? 'Export complete' : 'Nothing to export', type: ok ? 'success' : 'warning' })
  }

  const handlePrintRow = useCallback(async (row) => {
    await printGridRowDocument({
      moduleCode: PRINT_MODULE_CODES.DELIVERY_COMPLETE,
      row,
      company,
      print,
      toast,
    })
  }, [company, print, toast])
  const handlePrintList = useCallback(async () => {
    await printModuleList({
      moduleCode: PRINT_MODULE_CODES.DELIVERY_COMPLETE,
      company,
      print,
      toast,
      columns: DELIVERY_COLUMNS,
      rows,
      documentTitle: 'Delivery Complete List',
      summary: `${paged.total.toLocaleString('en-IN')} record(s)`,
    })
  }, [rows, paged.total, company, print, toast])

  useKeyboardPageActions({
    onNewF2: () => navigate('/operations/delivery-complete'),
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
        title="Delivery Complete"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Delivery', path: '/operations/delivery-complete/list' },
          { label: 'Delivery Complete' },
        ]}
      />
      <div className="delivery-complete-list-page flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2 sm:p-3">
          <OpsListActionBar
            newLabel="New Delivery"
            activeFilterCount={activeFilterCount}
            onNew={() => navigate('/operations/delivery-complete')}
            onSearch={openFilterDrawer}
            onFilter={openFilterDrawer}
            onExport={handleExport}
            onPrint={handlePrintList}
            onManageColumns={() => setColumnsSignal((n) => n + 1)}
            onRefresh={refreshList}
          />
          <LrListKpiCards cards={kpiCards} />
          <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Deliveries" width="md">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Date From" type="date" value={draftFilters.dateFrom} onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
              <Input label="Date To" type="date" value={draftFilters.dateTo} onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))} />
              <Input label="LR No." value={draftFilters.lrNo} onChange={(e) => setDraftFilters((f) => ({ ...f, lrNo: e.target.value }))} />
              <Input label="Trip No." value={draftFilters.tripNo} onChange={(e) => setDraftFilters((f) => ({ ...f, tripNo: e.target.value }))} />
              <Input label="Customer" value={draftFilters.customer} onChange={(e) => setDraftFilters((f) => ({ ...f, customer: e.target.value }))} />
              <Input label="Branch" value={draftFilters.branch} onChange={(e) => setDraftFilters((f) => ({ ...f, branch: e.target.value }))} />
              <Input label="From / Origin" value={draftFilters.fromCity} onChange={(e) => setDraftFilters((f) => ({ ...f, fromCity: e.target.value }))} />
              <Input label="To / Destination" value={draftFilters.toCity} onChange={(e) => setDraftFilters((f) => ({ ...f, toCity: e.target.value }))} />
              <Input label="Delivery Date" type="date" value={draftFilters.deliveryDate} onChange={(e) => setDraftFilters((f) => ({ ...f, deliveryDate: e.target.value }))} />
              <Select label="Delivery Status" options={['(All)', 'Ready for Delivery', 'Delivered', 'Delivery Completed', 'POD Received']} value={draftFilters.deliveryStatus} onChange={(e) => setDraftFilters((f) => ({ ...f, deliveryStatus: e.target.value }))} />
              <Select label="POD Status" options={['(All)', 'Pending', 'Delivered', 'Received', 'Verified']} value={draftFilters.podStatus} onChange={(e) => setDraftFilters((f) => ({ ...f, podStatus: e.target.value }))} />
              <Input label="Vehicle No." value={draftFilters.vehicle} onChange={(e) => setDraftFilters((f) => ({ ...f, vehicle: e.target.value }))} />
              <Input label="Driver" value={draftFilters.driver} onChange={(e) => setDraftFilters((f) => ({ ...f, driver: e.target.value }))} />
              <Select label="Delivery Type" options={['(All)', 'Door Delivery', 'Godown Delivery', 'Partial Delivery']} value={draftFilters.deliveryType} onChange={(e) => setDraftFilters((f) => ({ ...f, deliveryType: e.target.value }))} />
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
            rowPrintTitle="Print Delivery"
            exportFilename="delivery-complete-list"
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
        <KeyboardShortcutBar shortcuts={DELIVERY_COMPLETE_SHORTCUTS} />
      </div>
    </div>
  )
}
