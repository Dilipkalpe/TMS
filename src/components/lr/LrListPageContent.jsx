import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Columns3, Download, Eye, Filter, MoreVertical, Plus, Printer, RefreshCw, Search as SearchIcon,
} from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import Input, { Select } from '../ui/Input'
import ERPListPage from '../ui/ERPListPage'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { lrApi, lrOperationsApi } from '../../services/api'
import { lrDetailPath, lrEditPath } from '../../utils/docPath'
import {
  formatLrDate, lrBillingStatus, lrDeliveryStatus, lrPodStatus, lrTotalAmount, parsePackagesWeight,
} from '../../utils/lrDisplayHelpers'
import { formatCurrency } from '../ui/ReportFilters'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import LRPrintFormat from '../print/LRPrintFormat'

const STATUS_OPTIONS = ['(All)', 'LR Created', 'Loading Completed', 'In Transit', 'Delivery Completed', 'POD Uploaded', 'Invoice Generated', 'Closed']
const BOOKING_TYPES = ['(All)', 'FTL', 'PTL']
const FREIGHT_TYPES = ['(All)', 'To Pay', 'Paid', 'TBB', 'To Be Billed']

function KpiCard({ label, value, sub, color, icon: Icon }) {
  const colors = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
    orange: 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950/40',
    green: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40',
    violet: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950/40',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] opacity-70">{sub}</p>}
        </div>
        {Icon && <Icon className="h-8 w-8 opacity-40" />}
      </div>
    </div>
  )
}

export default function LrListPageContent({ embedded = false, onChanged }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [summary, setSummary] = useState({})
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', lrNo: '', customer: '', consignee: '',
    from: '', to: '', vehicle: '', branch: '(All)', status: '(All)',
    bookingType: '(All)', freightType: '(All)',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => {
      const params = buildListParams({ page, pageSize, search })
      if (filters.status && filters.status !== '(All)') params.status = filters.status
      return lrApi.list(params)
    },
    [filters.status],
  )

  useEffect(() => {
    lrOperationsApi.summary().then(setSummary).catch(() => {})
  }, [paged.items.length, onChanged])

  const filteredItems = useMemo(() => {
    let rows = [...(paged.items || [])]
    const f = filters
    if (f.lrNo) rows = rows.filter((r) => r.lrNumber?.toLowerCase().includes(f.lrNo.toLowerCase()))
    if (f.customer) rows = rows.filter((r) => (r.customerName || r.consignor || '').toLowerCase().includes(f.customer.toLowerCase()))
    if (f.consignee) rows = rows.filter((r) => (r.consignee || '').toLowerCase().includes(f.consignee.toLowerCase()))
    if (f.from) rows = rows.filter((r) => (r.from || '').toLowerCase().includes(f.from.toLowerCase()))
    if (f.to) rows = rows.filter((r) => (r.to || '').toLowerCase().includes(f.to.toLowerCase()))
    if (f.vehicle) rows = rows.filter((r) => (r.vehicle || '').toLowerCase().includes(f.vehicle.toLowerCase()))
    if (f.bookingType && f.bookingType !== '(All)') rows = rows.filter((r) => (r.businessType || 'FTL') === f.bookingType)
    if (f.freightType && f.freightType !== '(All)') rows = rows.filter((r) => r.paymentType === f.freightType)
    if (f.dateFrom) rows = rows.filter((r) => !r.lrDate || r.lrDate >= f.dateFrom)
    if (f.dateTo) rows = rows.filter((r) => !r.lrDate || r.lrDate <= f.dateTo)
    return rows
  }, [paged.items, filters])

  const totalAmount = useMemo(
    () => filteredItems.reduce((s, r) => s + lrTotalAmount(r), 0),
    [filteredItems],
  )

  const kpi = useMemo(() => {
    const c = summary.counts || {}
    return {
      total: summary.totalLR ?? paged.total ?? filteredItems.length,
      pending: (c['loading-pending'] ?? 0) + (c['lr-created'] ?? 0) + (c['vehicle-assigned'] ?? 0),
      delivered: c['delivered'] ?? c['pod-uploaded'] ?? 0,
      inTransit: c['dispatched'] ?? c['transit-pass-generated'] ?? 0,
      amount: totalAmount,
    }
  }, [summary, paged.total, filteredItems.length, totalAmount])

  const columns = useMemo(() => [
    { key: 'lrNumber', label: 'LR No', render: (r) => (
      <Link to={lrDetailPath(r.lrNumber)} className="font-semibold text-primary hover:underline">{r.lrNumber}</Link>
    ) },
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
      key: 'deliveryStatus', label: 'Delivery Status',
      render: (r) => { const d = lrDeliveryStatus(r.status); return <Badge variant={d.variant}>{d.label}</Badge> },
    },
    {
      key: 'billingStatus', label: 'Billing Status',
      render: (r) => { const b = lrBillingStatus(r.status); return <Badge variant={b.variant}>{b.label}</Badge> },
    },
    {
      key: 'podStatus', label: 'POD Status',
      render: (r) => { const p = lrPodStatus(r.status); return <Badge variant={p.variant}>{p.label}</Badge> },
    },
    { key: 'amount', label: 'Amount (₹)', render: (r) => formatCurrency(lrTotalAmount(r)) },
    {
      key: 'actions', label: 'Action',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" icon={Eye} onClick={() => navigate(lrDetailPath(r.lrNumber))} />
          <Button size="sm" variant="outline" icon={MoreVertical} onClick={() => navigate(lrEditPath(r.lrNumber))} />
        </div>
      ),
    },
  ], [navigate])

  const clearFilters = () => setFilters({
    dateFrom: '', dateTo: '', lrNo: '', customer: '', consignee: '',
    from: '', to: '', vehicle: '', branch: '(All)', status: '(All)',
    bookingType: '(All)', freightType: '(All)',
  })

  const handlePrint = async (row) => {
    try {
      const lr = await lrApi.get(row.lrNumber)
      print(<LRPrintFormat lr={lr} company={company} />)
    } catch (e) {
      toast({ title: 'Print failed', message: e.message, type: 'error' })
    }
  }

  const header = (
    <>
      {!embedded && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <span>Home / LR / LR List</span>
          <span className="text-xs">F2 New LR · F3 Search · F8 Refresh</span>
        </div>
      )}

      {!embedded && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard label="Total LR" value={kpi.total.toLocaleString('en-IN')} sub="All Time" color="blue" />
          <KpiCard label="Pending" value={kpi.pending.toLocaleString('en-IN')} sub="Not Delivered" color="orange" />
          <KpiCard label="Delivered" value={kpi.delivered.toLocaleString('en-IN')} sub="Completed" color="green" />
          <KpiCard label="In Transit" value={kpi.inTransit.toLocaleString('en-IN')} sub="Active Trips" color="violet" />
          <KpiCard label="Total Amount" value={formatCurrency(kpi.amount)} sub="Filtered Total" color="cyan" />
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button icon={Plus} onClick={() => navigate('/lr/entry')}>+ New LR (F2)</Button>
          <Button variant="outline" icon={SearchIcon} onClick={() => document.querySelector('[data-lr-list-search]')?.focus()}>Search (F3)</Button>
          <Button variant="outline" icon={Download}>Export Excel</Button>
          <Button variant="outline" icon={Printer}>Print</Button>
          <Button variant="outline" icon={Columns3}>Column</Button>
          <Button variant="outline" icon={Filter} onClick={() => setShowAdvanced((v) => !v)}>Filter</Button>
          <Button variant="outline" icon={RefreshCw} onClick={() => { paged.refresh(); onChanged?.() }}>Refresh</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Input label="Date From" type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
          <Input label="Date To" type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
          <Input label="LR No" value={filters.lrNo} onChange={(e) => setFilters((f) => ({ ...f, lrNo: e.target.value }))} />
          <Input label="Customer" value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))} />
          <Input label="Consignee" value={filters.consignee} onChange={(e) => setFilters((f) => ({ ...f, consignee: e.target.value }))} />
          <Input label="From / Origin" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          <Input label="To / Destination" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          <Input label="Vehicle No" value={filters.vehicle} onChange={(e) => setFilters((f) => ({ ...f, vehicle: e.target.value }))} />
          <Select label="Status" options={STATUS_OPTIONS} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} />
          <Select label="Booking Type" options={BOOKING_TYPES} value={filters.bookingType} onChange={(e) => setFilters((f) => ({ ...f, bookingType: e.target.value }))} />
          <Select label="Freight Type" options={FREIGHT_TYPES} value={filters.freightType} onChange={(e) => setFilters((f) => ({ ...f, freightType: e.target.value }))} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button icon={SearchIcon} onClick={() => paged.setSearch(filters.lrNo || filters.customer)}>Search</Button>
          <Button variant="outline" onClick={clearFilters}>Clear</Button>
          <Button variant="outline">Save Filter</Button>
          <button type="button" className="ml-auto text-xs text-primary hover:underline" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          </button>
        </div>
      </Card>
    </>
  )

  return (
    <div>
      {header}
      <ERPListPage
        module="LR"
        title={embedded ? undefined : 'LR List'}
        showAdd={false}
        searchPlaceholder="Search LR, customer, vehicle…"
        columns={columns}
        data={filteredItems}
        loading={paged.loading}
        error={paged.error}
        onRefreshExternal={() => { paged.refresh(); onChanged?.() }}
        onRowClick={(r) => navigate(lrDetailPath(r.lrNumber))}
        onPrint={handlePrint}
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
        addPosition="end"
        addLabel="New LR"
        onAdd={() => navigate('/lr/entry')}
      />
    </div>
  )
}
