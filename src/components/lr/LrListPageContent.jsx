import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Input, { Select } from '../ui/Input'
import ERPListPage from '../ui/ERPListPage'
import StatusSummaryCards from '../ui/StatusSummaryCards'
import { usePagedApiResource } from '../../hooks/usePagedApiResource'
import { useKeyboardPageActions } from '../../hooks/useKeyboardPageActions'
import { lrApi, lrOperationsApi } from '../../services/api'
import { lrDetailPath, lrEditPath, lrProcessPath } from '../../utils/docPath'
import {
  formatLrDate, lrBillingStatus, lrDeliveryStatus, lrPodStatus, lrTotalAmount, parsePackagesWeight,
} from '../../utils/lrDisplayHelpers'
import { formatCurrency } from '../ui/ReportFilters'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import LRPrintFormat from '../print/LRPrintFormat'
import { LR_STATUS_STEPS } from '../../constants/lrStatusFlow'
import { LR_KPI_CARDS, defaultDetailSectionForStatus, lrRowActions } from '../../constants/lrStatusNavigation'

const STATUS_OPTIONS = ['(All)', ...LR_STATUS_STEPS]
const BOOKING_TYPES = ['(All)', 'FTL', 'PTL']
const FREIGHT_TYPES = ['(All)', 'To Pay', 'Paid', 'TBB', 'To Be Billed']

const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  status: '(All)',
  bookingType: '(All)',
  freightType: '(All)',
}

function buildLrListParams({ page, pageSize, search, filters }) {
  const params = { page, pageSize, includeTotal: page === 1 }
  if (search?.trim()) params.search = search.trim()
  if (filters.status && filters.status !== '(All)') params.status = filters.status
  if (filters.freightType && filters.freightType !== '(All)') params.paymentType = filters.freightType
  if (filters.bookingType && filters.bookingType !== '(All)') params.businessType = filters.bookingType
  if (filters.dateFrom) params.dateFrom = filters.dateFrom
  if (filters.dateTo) params.dateTo = filters.dateTo
  return params
}

export default function LrListPageContent({ embedded = false, onChanged }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const { user } = useAuth()
  const [summary, setSummary] = useState({})
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => lrApi.list(buildLrListParams({ page, pageSize, search, filters: appliedFilters })),
    [appliedFilters],
  )

  const reloadSummary = useCallback(() => {
    lrOperationsApi.summary().then(setSummary).catch(() => {})
  }, [])

  useEffect(() => {
    reloadSummary()
  }, [paged.items.length, onChanged, reloadSummary])

  useKeyboardPageActions({
    onNew: () => navigate('/lr/entry'),
    enabled: !embedded,
  })

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters })
    paged.setPage(1)
  }

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    paged.setPage(1)
  }

  const openRow = (row) => {
    const section = defaultDetailSectionForStatus(row.status)
    navigate(`${lrDetailPath(row.lrNumber)}?section=${section}`)
  }

  const runPrimaryAction = (e, row) => {
    e.stopPropagation()
    if (row.status === 'Draft' || row.status === 'LR Created') {
      navigate(lrEditPath(row.lrNumber))
      return
    }
    navigate(lrProcessPath(row.lrNumber))
  }

  const runRowAction = (e, row, action) => {
    e.stopPropagation()
    if (action.id === 'view') {
      openRow(row)
      return
    }
    if (action.id === 'edit') {
      navigate(lrEditPath(row.lrNumber))
      return
    }
    if (action.id === 'approve-expense') {
      navigate('/lr/expense-approval')
      return
    }
    if (action.id === 'cancel') {
      toast({ title: 'Cancel LR', message: 'Use LR detail page to cancel this LR.', type: 'info' })
      return
    }
    const stepMap = {
      'assign-vehicle': 'loading',
      'transit-pass': 'transit',
      dispatch: 'delivery',
      pod: 'delivery',
      invoice: 'invoice',
      expense: 'expense',
      close: 'close',
    }
    navigate(lrProcessPath(row.lrNumber, stepMap[action.id] || 'loading'))
  }

  const handleDelete = async (row) => {
    if (!row?.lrNumber) return
    if (!window.confirm(`Delete LR ${row.lrNumber}?`)) return
    try {
      await lrApi.remove(row.lrNumber)
      toast({ title: 'Deleted', message: `LR ${row.lrNumber} removed.`, type: 'success' })
      paged.refresh()
      reloadSummary()
      onChanged?.()
    } catch (err) {
      toast({ title: 'Delete failed', message: err.message, type: 'error' })
    }
  }

  const handlePrint = async (row) => {
    try {
      const lr = await lrApi.get(row.lrNumber)
      print(<LRPrintFormat lr={lr} company={company} />)
    } catch (e) {
      toast({ title: 'Print failed', message: e.message, type: 'error' })
    }
  }

  const kpiCards = useMemo(() => LR_KPI_CARDS.slice(0, 5).map((kpi) => ({
    label: kpi.label,
    count: summary[kpi.field] ?? 0,
    icon: kpi.icon,
    color: kpi.color,
    onClick: () => navigate(kpi.stage === 'lr-list' ? '/lr/list' : `/lr?status=${kpi.stage}`),
  })), [summary, navigate])

  const activeFilterCount = useMemo(
    () => Object.entries(appliedFilters).filter(([, v]) => v && v !== '(All)').length,
    [appliedFilters],
  )

  const columns = useMemo(() => [
    {
      key: 'flow',
      label: 'Action',
      render: (r) => (
        <Button size="sm" icon={ArrowRight} onClick={(e) => runPrimaryAction(e, r)}>
          {r.status === 'Closed' ? 'View' : 'Continue'}
        </Button>
      ),
    },
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
    { key: 'consignee', label: 'Consignee' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'packages', label: 'Packages', render: (r) => parsePackagesWeight(r.quantity).packages },
    { key: 'weight', label: 'Weight (Kg)', render: (r) => parsePackagesWeight(r.quantity).weight },
    { key: 'freight', label: 'Freight (₹)', render: (r) => formatCurrency(r.freight) },
    { key: 'vehicle', label: 'Vehicle No', render: (r) => r.vehicle || '—' },
    {
      key: 'deliveryStatus',
      label: 'Delivery',
      render: (r) => { const d = lrDeliveryStatus(r.status); return <Badge variant={d.variant}>{d.label}</Badge> },
    },
    {
      key: 'billingStatus',
      label: 'Billing',
      render: (r) => { const b = lrBillingStatus(r.status); return <Badge variant={b.variant}>{b.label}</Badge> },
    },
    {
      key: 'podStatus',
      label: 'POD',
      render: (r) => { const p = lrPodStatus(r.status); return <Badge variant={p.variant}>{p.label}</Badge> },
    },
    { key: 'amount', label: 'Amount (₹)', render: (r) => formatCurrency(lrTotalAmount(r)) },
    {
      key: 'actions',
      label: 'More',
      render: (r) => {
        const actions = lrRowActions(r.status || 'LR Created', user?.role).filter((a) => !a.primary)
        return (
          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
            {actions.slice(0, 2).map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.danger ? 'outline' : 'outline'}
                className={action.danger ? 'text-red-600' : ''}
                onClick={(e) => runRowAction(e, r, action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )
      },
    },
  ], [user?.role, navigate])

  const filterRow = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          icon={Filter}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          {showFilters ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
        </Button>
        {activeFilterCount > 0 && (
          <Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>
        )}
        {!embedded && (
          <Link to="/lr" className="ml-auto text-xs text-primary hover:underline">
            Open LR Management workflow →
          </Link>
        )}
      </div>

      {showFilters && (
        <div className="grid gap-2 rounded-lg border border-primary/15 bg-slate-50/80 p-2 sm:grid-cols-2 lg:grid-cols-6 dark:bg-slate-900/40">
          <Input label="Date From" type="date" value={draftFilters.dateFrom} onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
          <Input label="Date To" type="date" value={draftFilters.dateTo} onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))} />
          <Select label="Status" options={STATUS_OPTIONS} value={draftFilters.status} onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))} />
          <Select label="Booking Type" options={BOOKING_TYPES} value={draftFilters.bookingType} onChange={(e) => setDraftFilters((f) => ({ ...f, bookingType: e.target.value }))} />
          <Select label="Freight Type" options={FREIGHT_TYPES} value={draftFilters.freightType} onChange={(e) => setDraftFilters((f) => ({ ...f, freightType: e.target.value }))} />
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={applyFilters}>Apply</Button>
            <Button size="sm" variant="outline" onClick={clearFilters}>Clear</Button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!embedded && (
        <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Home / LR / LR List</span>
            <span>F2 New LR · F3 Search · F8 Refresh</span>
          </div>
          <div className="mb-2">
            <StatusSummaryCards cards={kpiCards} />
          </div>
        </>
      )}

      <ERPListPage
        module="LR"
        title={embedded ? undefined : undefined}
        showAdd
        addLabel="New LR (F2)"
        addPosition="start"
        onAdd={() => navigate('/lr/entry')}
        searchPlaceholder="Search LR, customer, consignee, vehicle, route…"
        filterRow={filterRow}
        columns={columns}
        data={paged.items}
        loading={paged.loading}
        error={paged.error}
        onRefreshExternal={() => { paged.refresh(); reloadSummary(); onChanged?.() }}
        onRowClick={openRow}
        onEdit={(r) => navigate(lrEditPath(r.lrNumber))}
        onDelete={handleDelete}
        onPrint={handlePrint}
        rowPrintTitle="Print LR"
        exportFilename="lr-list"
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
  )
}
