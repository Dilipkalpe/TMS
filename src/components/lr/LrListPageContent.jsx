import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Tags } from 'lucide-react'
import Badge from '../ui/Badge'
import ERPListPage from '../ui/ERPListPage'
import ERPPageTitle from '../ui/ERPPageTitle'
import { buildStandardRowActions } from '../ui/TableRowActions'
import LrListActionBar from './LrListActionBar'
import LrListKpiCards from './LrListKpiCards'
import LrListFilterPanel from './LrListFilterPanel'
import LrListTableToolbar from './LrListTableToolbar'
import LrListActiveFilterChips from './LrListActiveFilterChips'
import LrLabelPrintModal from './LrLabelPrintModal'
import SlideDrawer from '../ui/SlideDrawer'
import KeyboardShortcutBar, { LR_LIST_SHORTCUTS } from '../keyboard/KeyboardShortcutBar'
import { usePagedApiResource } from '../../hooks/usePagedApiResource'
import { useKeyboardPageActions } from '../../hooks/useKeyboardPageActions'
import { branchesApi, lrApi, lrOperationsApi } from '../../services/api'
import { lrDetailPath, lrEditPath } from '../../utils/docPath'
import {
  formatLrDate,
  lrBillingStatus,
  lrDeliveryStatus,
  lrPodStatus,
  lrStatusBadgeVariant,
  lrTotalAmount,
  parsePackagesWeight,
} from '../../utils/lrDisplayHelpers'
import { clearLrFilterKeys } from '../../utils/lrListFilterUtils'
import { formatCurrency } from '../ui/ReportFilters'
import { exportToCsv } from '../../utils/export'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { printModuleList } from '../../services/printService'
import { printGridRowDocument } from '../../utils/printGridDocument'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { LR_STATUS_STEPS } from '../../constants/lrStatusFlow'
import { defaultDetailSectionForStatus } from '../../constants/lrStatusNavigation'

const FILTER_STORAGE_KEY = 'lr-list-saved-filters'
const STATUS_OPTIONS = ['(All)', ...LR_STATUS_STEPS]
const BOOKING_TYPES = ['(All)', 'FTL', 'PTL']
const FREIGHT_TYPES = ['(All)', 'To Pay', 'Paid', 'TBB', 'To Be Billed']

const STAGE_TO_LR_STATUS = {
  'lr-list': '(All)',
  'lr-created': 'LR Created',
  'loading-pending': 'LR Created',
  'loading-completed': 'Loading Completed',
  'vehicle-assigned': 'Loading Completed',
  'transit-pass-generated': 'Transit Pass Generated',
  dispatched: 'In Transit',
  delivered: 'Delivery Completed',
  'pod-uploaded': 'POD Uploaded',
  'invoice-generated': 'Invoice Generated',
  'expense-pending': 'Expense Added',
  'expense-approved': 'Expense Approved',
  closed: 'Closed',
}

const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  lrNo: '',
  customer: '',
  consignee: '',
  fromCity: '',
  toCity: '',
  vehicle: '',
  branch: '(All)',
  status: '(All)',
  bookingType: '(All)',
  freightType: '(All)',
}

const EXPORT_COLUMNS = [
  { key: 'lrNumber', label: 'LR No' },
  { key: 'lrDate', label: 'Date' },
  { key: 'customer', label: 'Customer' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'route', label: 'From / To' },
  { key: 'packages', label: 'Packages' },
  { key: 'weight', label: 'Weight (Kg)' },
  { key: 'freight', label: 'Freight' },
  { key: 'vehicle', label: 'Vehicle No' },
  { key: 'deliveryStatus', label: 'Delivery Status' },
  { key: 'billingStatus', label: 'Billing Status' },
  { key: 'podStatus', label: 'POD Status' },
  { key: 'amount', label: 'Amount' },
]

function buildFilterSearch(filters) {
  return [filters.lrNo, filters.customer, filters.consignee, filters.fromCity, filters.toCity, filters.vehicle]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(' ')
}

function buildLrListParams({ page, pageSize, filters }) {
  const params = { page, pageSize, includeTotal: page === 1 }
  const search = buildFilterSearch(filters)
  if (search) params.search = search
  if (filters.status && filters.status !== '(All)') params.status = filters.status
  if (filters.freightType && filters.freightType !== '(All)') params.paymentType = filters.freightType
  if (filters.bookingType && filters.bookingType !== '(All)') params.businessType = filters.bookingType
  if (filters.dateFrom) params.dateFrom = filters.dateFrom
  if (filters.dateTo) params.dateTo = filters.dateTo
  return params
}

function mapExportRow(r) {
  const d = lrDeliveryStatus(r.status)
  const b = lrBillingStatus(r.status)
  const p = lrPodStatus(r.status)
  const pkg = parsePackagesWeight(r.quantity)
  return {
    lrNumber: r.lrNumber,
    lrDate: formatLrDate(r.lrDate),
    customer: r.customerName || r.consignor || '',
    consignee: r.consignee || '',
    route: `${r.from || r.fromCity || ''} to ${r.to || r.toCity || ''}`,
    packages: pkg.packages,
    weight: pkg.weight,
    freight: formatCurrency(r.freight),
    vehicle: r.vehicle || r.vehicleNumber || '',
    deliveryStatus: d.label,
    billingStatus: b.label,
    podStatus: p.label,
    amount: formatCurrency(lrTotalAmount(r)),
  }
}

export default function LrListPageContent({ embedded = false, onChanged }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [summary, setSummary] = useState({})
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [branchOptions, setBranchOptions] = useState(['(All)'])
  const [columnsSignal, setColumnsSignal] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const listRef = useRef(null)

  const paged = usePagedApiResource(
    ({ page, pageSize }) => lrApi.list(buildLrListParams({ page, pageSize, filters: appliedFilters })),
    [appliedFilters],
  )

  const reloadSummary = useCallback(() => {
    lrOperationsApi.summary().then(setSummary).catch(() => {})
  }, [])

  const refreshList = useCallback(() => {
    paged.refresh()
    reloadSummary()
    onChanged?.()
  }, [paged, reloadSummary, onChanged])

  useEffect(() => {
    reloadSummary()
  }, [paged.items.length, onChanged, reloadSummary])

  useEffect(() => {
    branchesApi.list().then((rows) => {
      const names = (rows || []).map((b) => b.name || b.code).filter(Boolean)
      setBranchOptions(['(All)', ...names])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (embedded) return
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      setDraftFilters((f) => ({ ...EMPTY_FILTERS, ...saved }))
    } catch { /* ignore */ }
  }, [embedded])

  useEffect(() => {
    if (embedded) return
    const stage = searchParams.get('status')
    if (!stage) return
    const mapped = STAGE_TO_LR_STATUS[stage]
    if (!mapped || mapped === '(All)') return
    setDraftFilters((f) => ({ ...f, status: mapped }))
    setAppliedFilters((f) => ({ ...f, status: mapped }))
  }, [searchParams, embedded])

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

  const saveFilters = useCallback(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(draftFilters))
      toast({ title: 'Filter saved', message: 'Your filter preset was saved.', type: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    }
  }, [draftFilters, toast])

  const removeFilterKeys = useCallback((keys) => {
    setDraftFilters((f) => clearLrFilterKeys(f, keys))
    setAppliedFilters((f) => clearLrFilterKeys(f, keys))
    paged.setPage(1)
  }, [paged])

  useKeyboardPageActions({
    onNewF2: () => navigate('/lr/entry'),
    onSearch: openFilterDrawer,
    onPrint: () => listRef.current?.print?.(),
    onPreview: refreshList,
    onCancel: () => setFilterOpen(false),
    enabled: !embedded,
  }, [openFilterDrawer, refreshList, navigate, embedded])

  const openRow = (row) => {
    const section = defaultDetailSectionForStatus(row.status)
    navigate(`${lrDetailPath(row.lrNumber)}?section=${section}`)
  }

  const handleDelete = async (row) => {
    if (!row?.lrNumber) return
    if (!window.confirm(`Delete LR ${row.lrNumber}?`)) return
    try {
      await lrApi.remove(row.lrNumber)
      toast({ title: 'Deleted', message: `LR ${row.lrNumber} removed.`, type: 'success' })
      refreshList()
    } catch (err) {
      toast({ title: 'Delete failed', message: err.message, type: 'error' })
    }
  }

  const handlePrint = async (row) => {
    await printGridRowDocument({
      moduleCode: PRINT_MODULE_CODES.LR_LIST,
      row,
      company,
      print,
      toast,
    })
  }

  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [labelLrNumber, setLabelLrNumber] = useState(null)

  const handleLblPrint = useCallback((row) => {
    if (!row?.lrNumber) return
    setLabelLrNumber(row.lrNumber)
    setLabelModalOpen(true)
  }, [])

  const rowActions = useCallback((row) => [
    ...buildStandardRowActions({
      onView: openRow,
      onEdit: (r) => navigate(lrEditPath(r.lrNumber)),
      onDelete: handleDelete,
      onPrint: handlePrint,
      printTitle: 'Print LR',
    }),
    {
      id: 'lbl-print',
      icon: Tags,
      label: 'LBL Print',
      variant: 'outline',
      onClick: handleLblPrint,
    },
  ], [handleDelete, handlePrint, handleLblPrint, navigate])

  const handleExport = useCallback(() => {
    const rows = paged.items.map(mapExportRow)
    const ok = exportToCsv(rows, EXPORT_COLUMNS, 'lr-list.csv')
    toast({ title: ok ? 'Export complete' : 'Nothing to export', type: ok ? 'success' : 'warning' })
  }, [paged.items, toast])

  const handlePrintList = useCallback(async () => {
    const rows = paged.items.map(mapExportRow)
    await printModuleList({
      moduleCode: PRINT_MODULE_CODES.LR_LIST,
      company,
      print,
      toast,
      columns: EXPORT_COLUMNS,
      rows,
      documentTitle: 'LR List',
      summary: `${paged.total.toLocaleString('en-IN')} record(s)`,
    })
  }, [paged.items, paged.total, company, print, toast])

  const kpiCards = useMemo(() => [
    {
      label: 'Total LR',
      subtitle: 'All Time',
      count: summary.totalLR ?? 0,
      icon: 'Layers',
      color: 'blue',
      onClick: () => { clearFilters(); navigate('/lr/list') },
    },
    {
      label: 'Pending',
      subtitle: 'Not Delivered',
      count: summary.pendingNotDelivered ?? Math.max(0, (summary.totalLR ?? 0) - (summary.deliveredComplete ?? summary.delivered ?? 0)),
      icon: 'Clock',
      color: 'orange',
      onClick: () => navigate('/lr/list?status=loading-pending'),
    },
    {
      label: 'Delivered',
      subtitle: 'Completed',
      count: summary.deliveredComplete ?? summary.delivered ?? 0,
      icon: 'PackageCheck',
      color: 'green',
      onClick: () => navigate('/lr/list?status=delivered'),
    },
    {
      label: 'In Transit',
      subtitle: 'Active Trips',
      count: summary.inTransit ?? 0,
      icon: 'Truck',
      color: 'violet',
      onClick: () => navigate('/lr/list?status=dispatched'),
    },
    {
      label: 'Total Amount',
      subtitle: 'All LR Amount',
      count: formatCurrency(summary.totalAmount ?? 0),
      color: 'teal',
    },
  ], [summary, navigate, clearFilters])

  const activeFilterCount = useMemo(
    () => Object.entries(appliedFilters).filter(([, v]) => v && v !== '(All)').length,
    [appliedFilters],
  )

  const columns = useMemo(() => [
    {
      key: 'lrNumber',
      label: 'LR No',
      render: (r) => (
        <Link to={lrDetailPath(r.lrNumber)} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
          {r.lrNumber}
        </Link>
      ),
    },
    { key: 'lrDate', label: 'Date', render: (r) => formatLrDate(r.lrDate) },
    { key: 'customer', label: 'Customer', render: (r) => r.customerName || r.consignor || '—' },
    { key: 'consignee', label: 'Consignee', render: (r) => r.consignee || '—' },
    {
      key: 'route',
      label: 'From / To',
      render: (r) => `${r.from || r.fromCity || '—'} to ${r.to || r.toCity || '—'}`,
    },
    { key: 'packages', label: 'Packages', render: (r) => parsePackagesWeight(r.quantity).packages },
    { key: 'weight', label: 'Weight (Kg)', render: (r) => parsePackagesWeight(r.quantity).weight },
    { key: 'freight', label: 'Freight (₹)', render: (r) => formatCurrency(r.freight) },
    { key: 'vehicle', label: 'Vehicle No', render: (r) => r.vehicle || r.vehicleNumber || '—' },
    {
      key: 'deliveryStatus',
      label: 'Delivery Status',
      render: (r) => {
        const d = lrDeliveryStatus(r.status)
        return <Badge variant={lrStatusBadgeVariant(d.variant)}>{d.label}</Badge>
      },
    },
    {
      key: 'billingStatus',
      label: 'Billing Status',
      render: (r) => {
        const b = lrBillingStatus(r.status)
        return <Badge variant={lrStatusBadgeVariant(b.variant)}>{b.label}</Badge>
      },
    },
    {
      key: 'podStatus',
      label: 'POD Status',
      render: (r) => {
        const p = lrPodStatus(r.status)
        return <Badge variant={lrStatusBadgeVariant(p.variant)}>{p.label}</Badge>
      },
    },
    { key: 'amount', label: 'Amount (₹)', render: (r) => formatCurrency(lrTotalAmount(r)) },
  ], [navigate])

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

  const listBlock = (
    <ERPListPage
      ref={listRef}
      module="LR"
      listVariant={embedded ? 'default' : 'lr'}
      hideToolbar
      showAdd={false}
      openColumnsSignal={columnsSignal}
      filterRow={embedded ? undefined : null}
      tableToolbar={embedded ? undefined : tableToolbar}
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={refreshList}
      onRowClick={openRow}
      rowActions={rowActions}
      getRowKey={(row) => row.lrNumber}
      exportFilename="lr-list"
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
    />
  )

  const labelModal = (
    <LrLabelPrintModal
      open={labelModalOpen}
      onClose={() => { setLabelModalOpen(false); setLabelLrNumber(null) }}
      lrNumber={labelLrNumber}
    />
  )

  if (embedded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {listBlock}
        {labelModal}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {labelModal}
      <ERPPageTitle
        module="LR"
        title="LR List"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'LR', path: '/lr/list' },
          { label: 'LR List' },
        ]}
      />
      <div className="loading-slip-list-page lr-list-page flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2 sm:p-3">
          <LrListActionBar
            onNew={() => navigate('/lr/entry')}
            onNewBulk={() => navigate('/lr/bulk')}
            onSearch={openFilterDrawer}
            onExport={handleExport}
            onPrint={handlePrintList}
            onManageColumns={() => setColumnsSignal((n) => n + 1)}
            onRefresh={refreshList}
            onFilter={openFilterDrawer}
            activeFilterCount={activeFilterCount}
          />
          <LrListKpiCards cards={kpiCards} />
          {activeFilterCount > 0 && (
            <LrListActiveFilterChips
              filters={appliedFilters}
              onRemove={removeFilterKeys}
              onClearAll={clearFilters}
            />
          )}
          <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter LR List" width="lg">
            <LrListFilterPanel
              inDrawer
              draftFilters={draftFilters}
              onChange={setDraftFilters}
              statusOptions={STATUS_OPTIONS}
              bookingTypes={BOOKING_TYPES}
              freightTypes={FREIGHT_TYPES}
              branchOptions={branchOptions}
              onSearch={applyFilters}
              onClear={clearFilters}
              onSave={saveFilters}
            />
          </SlideDrawer>
          {listBlock}
        </div>
        <KeyboardShortcutBar shortcuts={LR_LIST_SHORTCUTS} />
      </div>
    </div>
  )
}
