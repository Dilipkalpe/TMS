import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, IndianRupee, Printer } from 'lucide-react'
import ERPListPage from '../ui/ERPListPage'
import ERPPageTitle from '../ui/ERPPageTitle'
import Badge, { statusVariant } from '../ui/Badge'
import OpsListActionBar from './OpsListActionBar'
import LrListKpiCards from '../lr/LrListKpiCards'
import LrListTableToolbar from '../lr/LrListTableToolbar'
import SlideDrawer from '../ui/SlideDrawer'
import Input, { Select } from '../ui/Input'
import Button from '../ui/Button'
import KeyboardShortcutBar, { BILLING_SHORTCUTS } from '../keyboard/KeyboardShortcutBar'
import BillingInvoiceFlowBanner from '../billing/BillingInvoiceFlowBanner'
import InvoicePaymentModal from '../billing/InvoicePaymentModal'
import { formatCurrency } from '../ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { useKeyboardPageActions } from '../../hooks/useKeyboardPageActions'
import { operationsModulesApi } from '../../services/api'
import { BILLING_COLUMNS, MODULE_KPI_MAP } from '../../config/tmsModules'
import { exportToCsv } from '../../utils/export'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { printModuleList } from '../../services/printService'
import { printGridRowDocument } from '../../utils/printGridDocument'
import { PRINT_MODULE_CODES } from '../../config/printModules'

const KPI_ICONS = {
  total: 'Receipt',
  pending: 'Clock',
  paid: 'CheckCircle2',
  outstanding: 'IndianRupee',
  todayAmount: 'Calendar',
}

const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  invoiceNo: '',
  lrNo: '',
  customer: '',
  branch: '',
  paymentStatus: '(All)',
  gstInvoice: '(All)',
  fromCity: '',
  toCity: '',
}

function countActiveFilters(f) {
  return Object.entries(f).filter(([, v]) => v && v !== '(All)').length
}

function formatDate(val) {
  if (!val) return '—'
  return String(val)
}

function mapRow(r) {
  return {
    ...r,
    invoiceDate: formatDate(r.invoiceDate),
    freight: Number(r.freight ?? 0),
    gst: Number(r.gst ?? 0),
    totalAmount: Number(r.totalAmount ?? 0),
    receivedAmount: Number(r.receivedAmount ?? 0),
    outstanding: Number(r.outstanding ?? 0),
    paymentStatus: r.paymentStatus || 'Unpaid',
  }
}

function pct(part, total) {
  if (!total) return null
  return `${((part / total) * 100).toFixed(2)}% of Total`
}

export default function BillingListPageContent() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [summary, setSummary] = useState({})
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [columnsSignal, setColumnsSignal] = useState(0)
  const [payInvoice, setPayInvoice] = useState(null)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => {
      const params = buildListParams({ page, pageSize, search })
      if (appliedFilters.dateFrom) params.dateFrom = appliedFilters.dateFrom
      if (appliedFilters.dateTo) params.dateTo = appliedFilters.dateTo
      if (appliedFilters.paymentStatus !== '(All)') params.paymentStatus = appliedFilters.paymentStatus
      const extra = [
        appliedFilters.invoiceNo, appliedFilters.lrNo, appliedFilters.customer,
        appliedFilters.branch, appliedFilters.fromCity, appliedFilters.toCity,
      ].filter(Boolean).join(' ')
      if (extra) params.search = [params.search, extra].filter(Boolean).join(' ')
      return operationsModulesApi.list('billing', params)
    },
    [appliedFilters],
  )

  const reloadSummary = useCallback(() => {
    operationsModulesApi.summary('billing').then(setSummary).catch(() => {})
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
    if (row?.id) {
      navigate(`/accounting/freight-invoices/${row.id}`)
      return
    }
    if (row?.lrNumber) {
      navigate(`/operations/billing/invoice?lr=${encodeURIComponent(row.lrNumber)}`)
    }
  }, [navigate])

  const openPay = useCallback((row) => {
    if (!row?.id) {
      toast({ title: 'Cannot pay', message: 'Invoice id missing.', type: 'warning' })
      return
    }
    if (Number(row.outstanding) <= 0) {
      toast({ title: 'Already paid', type: 'info' })
      return
    }
    setPayInvoice(row)
  }, [toast])

  const rows = useMemo(() => paged.items.map(mapRow), [paged.items])
  const total = summary.total ?? 0
  const pending = summary.pending ?? 0

  const kpiCards = useMemo(() => (MODULE_KPI_MAP.billing || []).map((k) => {
    const raw = summary[k.field] ?? 0
    let count = raw
    let subtitle = k.subtitle
    if (k.money) count = formatCurrency(raw)
    if (k.field === 'pending' && total > 0) subtitle = pct(raw, total)
    if (k.field === 'paid' && total > 0) subtitle = pct(raw, total)
    if (k.field === 'outstanding') subtitle = pending > 0 ? `from ${pending.toLocaleString('en-IN')} Bills` : undefined
    if (k.field === 'todayAmount') subtitle = 'Today'
    return {
      label: k.label,
      count,
      icon: KPI_ICONS[k.field] || 'Layers',
      color: k.color === 'cyan' ? 'teal' : k.color === 'red' ? 'violet' : k.color,
      subtitle,
    }
  }), [summary, total, pending])

  const tableColumns = useMemo(() => BILLING_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    render: (r) => {
      const val = r[col.key]
      if (col.badge) {
        return <Badge variant={statusVariant(val)}>{val || '—'}</Badge>
      }
      if (col.money) {
        const cls = col.key === 'outstanding' && val > 0 ? 'font-semibold text-red-600' : ''
        return <span className={cls}>{formatCurrency(val)}</span>
      }
      if (col.key === 'invoiceNo' || col.key === 'lrNumber') {
        return (
          <button type="button" className="font-semibold text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openRow(r) }}>
            {val || '—'}
          </button>
        )
      }
      return val ?? '—'
    },
  })), [openRow])

  const exportRows = useMemo(() => rows.map((r) => ({
    ...r,
    freight: formatCurrency(r.freight),
    gst: formatCurrency(r.gst),
    totalAmount: formatCurrency(r.totalAmount),
    receivedAmount: formatCurrency(r.receivedAmount),
    outstanding: formatCurrency(r.outstanding),
  })), [rows])

  const handleExport = () => {
    const ok = exportToCsv(exportRows, BILLING_COLUMNS, 'billing-list.csv')
    toast({ title: ok ? 'Export complete' : 'Nothing to export', type: ok ? 'success' : 'warning' })
  }

  const handlePrintRow = useCallback(async (row) => {
    await printGridRowDocument({
      moduleCode: PRINT_MODULE_CODES.BILLING,
      row,
      company,
      print,
      toast,
    })
  }, [company, print, toast])

  const rowActions = useCallback((row) => [
    {
      id: 'view',
      icon: Eye,
      label: 'View invoice',
      onClick: openRow,
    },
    {
      id: 'pay',
      icon: IndianRupee,
      label: 'Pay',
      variant: 'primary',
      onClick: openPay,
      hidden: () => Number(row.outstanding) <= 0,
    },
    {
      id: 'print',
      icon: Printer,
      label: 'Print Bill',
      onClick: handlePrintRow,
    },
  ], [openRow, openPay, handlePrintRow])

  const handlePrintList = useCallback(async () => {
    await printModuleList({
      moduleCode: PRINT_MODULE_CODES.BILLING,
      company,
      print,
      toast,
      columns: BILLING_COLUMNS.map((c) => ({ ...c, money: false })),
      rows: exportRows,
      documentTitle: 'Billing List',
      summary: `${paged.total.toLocaleString('en-IN')} record(s)`,
    })
  }, [rows, exportRows, paged.total, company, print, toast])

  useKeyboardPageActions({
    onNewF2: () => navigate('/operations/billing/invoice'),
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
        module="Billing"
        title="Billing List"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Billing', path: '/operations/billing/list' },
          { label: 'Billing List' },
        ]}
      />
      <div className="billing-list-page flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2 sm:p-3">
          <BillingInvoiceFlowBanner currentStep={1} />
          <OpsListActionBar
            newLabel="New Bill"
            activeFilterCount={activeFilterCount}
            onNew={() => navigate('/operations/billing/invoice')}
            onSearch={openFilterDrawer}
            onFilter={openFilterDrawer}
            onExport={handleExport}
            onPrint={handlePrintList}
            onManageColumns={() => setColumnsSignal((n) => n + 1)}
            onRefresh={refreshList}
          />
          <LrListKpiCards cards={kpiCards} />
          <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Bills" width="md">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Date From" type="date" value={draftFilters.dateFrom} onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
              <Input label="Date To" type="date" value={draftFilters.dateTo} onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))} />
              <Input label="Invoice No." value={draftFilters.invoiceNo} onChange={(e) => setDraftFilters((f) => ({ ...f, invoiceNo: e.target.value }))} />
              <Input label="LR No." value={draftFilters.lrNo} onChange={(e) => setDraftFilters((f) => ({ ...f, lrNo: e.target.value }))} />
              <Input label="Customer" value={draftFilters.customer} onChange={(e) => setDraftFilters((f) => ({ ...f, customer: e.target.value }))} />
              <Input label="Branch" value={draftFilters.branch} onChange={(e) => setDraftFilters((f) => ({ ...f, branch: e.target.value }))} />
              <Select label="Payment Status" options={['(All)', 'Paid', 'Unpaid', 'Partial']} value={draftFilters.paymentStatus} onChange={(e) => setDraftFilters((f) => ({ ...f, paymentStatus: e.target.value }))} />
              <Select label="GST Invoice" options={['(All)', 'Yes', 'No']} value={draftFilters.gstInvoice} onChange={(e) => setDraftFilters((f) => ({ ...f, gstInvoice: e.target.value }))} />
              <Input label="From / Origin" value={draftFilters.fromCity} onChange={(e) => setDraftFilters((f) => ({ ...f, fromCity: e.target.value }))} />
              <Input label="To / Destination" value={draftFilters.toCity} onChange={(e) => setDraftFilters((f) => ({ ...f, toCity: e.target.value }))} />
            </div>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <Button onClick={applyFilters}>Search</Button>
              <Button variant="outline" onClick={clearFilters}>Reset</Button>
            </div>
          </SlideDrawer>

          <ERPListPage
            module="Billing"
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
            rowActions={rowActions}
            exportFilename="billing-list"
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
        <KeyboardShortcutBar shortcuts={BILLING_SHORTCUTS} />
      </div>

      <InvoicePaymentModal
        open={Boolean(payInvoice)}
        invoice={payInvoice}
        onClose={() => setPayInvoice(null)}
        onPaid={() => refreshList()}
      />
    </div>
  )
}
