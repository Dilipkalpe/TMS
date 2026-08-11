import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, PenLine } from 'lucide-react'
import ERPListPage from '../ui/ERPListPage'
import ERPPageTitle from '../ui/ERPPageTitle'
import Badge, { statusVariant } from '../ui/Badge'
import OpsListActionBar from './OpsListActionBar'
import LrListKpiCards from '../lr/LrListKpiCards'
import LrListTableToolbar from '../lr/LrListTableToolbar'
import SlideDrawer from '../ui/SlideDrawer'
import Input, { Select } from '../ui/Input'
import Button from '../ui/Button'
import KeyboardShortcutBar, { POD_SHORTCUTS } from '../keyboard/KeyboardShortcutBar'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { useKeyboardPageActions } from '../../hooks/useKeyboardPageActions'
import { operationsModulesApi } from '../../services/api'
import { POD_COLUMNS, MODULE_KPI_MAP } from '../../config/tmsModules'
import { exportToCsv } from '../../utils/export'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { printModuleList } from '../../services/printService'
import { printGridRowDocument } from '../../utils/printGridDocument'
import { PRINT_MODULE_CODES } from '../../config/printModules'

const KPI_ICONS = {
  total: 'Upload',
  received: 'CheckCircle2',
  pending: 'Clock',
  verified: 'ShieldCheck',
  today: 'Calendar',
}

const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  lrNo: '',
  tripNo: '',
  customer: '',
  branch: '',
  podStatus: '(All)',
  verificationStatus: '(All)',
  deliveryDate: '',
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

function formatDateTime(val) {
  if (!val) return '—'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

function mapRow(r) {
  const verified = r.verificationStatus === 'Verified'
  const received = r.podStatus === 'Received' || verified
  return {
    ...r,
    deliveryDate: formatDate(r.deliveryDate),
    receivedOn: formatDateTime(r.receivedOn),
    receivedBy: r.receivedBy || '—',
    podStatus: r.podStatus || 'Pending',
    verificationStatus: r.verificationStatus || 'Pending',
    signature: verified ? 'yes' : '',
    photo: received ? 'yes' : '',
  }
}

function pct(part, total) {
  if (!total) return null
  return `${((part / total) * 100).toFixed(2)}%`
}

function MediaCell({ kind, has }) {
  if (!has) return <span className="text-slate-400">—</span>
  const Icon = kind === 'signature' ? PenLine : Image
  return (
    <span className="inline-flex h-8 w-12 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500">
      <Icon className="h-4 w-4" />
    </span>
  )
}

export default function PodListPageContent() {
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
      if (appliedFilters.podStatus !== '(All)') params.status = appliedFilters.podStatus
      const extra = [
        appliedFilters.lrNo, appliedFilters.tripNo, appliedFilters.customer,
        appliedFilters.branch, appliedFilters.fromCity, appliedFilters.toCity,
      ].filter(Boolean).join(' ')
      if (extra) params.search = [params.search, extra].filter(Boolean).join(' ')
      return operationsModulesApi.list('pod', params)
    },
    [appliedFilters],
  )

  const reloadSummary = useCallback(() => {
    operationsModulesApi.summary('pod').then(setSummary).catch(() => {})
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
    navigate(`/operations/delivery/pod?lr=${encodeURIComponent(row.lrNumber)}`)
  }, [navigate])

  const rows = useMemo(() => paged.items.map(mapRow), [paged.items])
  const total = summary.total ?? 0

  const kpiCards = useMemo(() => (MODULE_KPI_MAP.pod || []).map((k) => {
    const raw = summary[k.field] ?? 0
    let subtitle = k.subtitle
    if (k.field === 'received' && total > 0) subtitle = pct(raw, total)
    if (k.field === 'pending' && total > 0) subtitle = pct(raw, total)
    if (k.field === 'verified' && total > 0) subtitle = pct(raw, total)
    if (k.field === 'today') subtitle = new Date().toLocaleDateString('en-IN')
    return {
      label: k.label,
      count: raw,
      icon: KPI_ICONS[k.field] || 'Layers',
      color: k.color === 'cyan' ? 'teal' : k.color,
      subtitle,
    }
  }), [summary, total])

  const exportColumns = useMemo(() => POD_COLUMNS.filter((c) => !['signature', 'photo'].includes(c.key)), [])

  const tableColumns = useMemo(() => POD_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    render: (r) => {
      const val = r[col.key]
      if (col.badge) return <Badge variant={statusVariant(val)}>{val || '—'}</Badge>
      if (col.key === 'signature') return <MediaCell kind="signature" has={!!r.signature} />
      if (col.key === 'photo') return <MediaCell kind="photo" has={!!r.photo} />
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
    const ok = exportToCsv(rows, exportColumns, 'pod-list.csv')
    toast({ title: ok ? 'Export complete' : 'Nothing to export', type: ok ? 'success' : 'warning' })
  }

  const handlePrintRow = useCallback(async (row) => {
    await printGridRowDocument({
      moduleCode: PRINT_MODULE_CODES.POD,
      row,
      company,
      print,
      toast,
    })
  }, [company, print, toast])
  const handlePrintList = useCallback(async () => {
    await printModuleList({
      moduleCode: PRINT_MODULE_CODES.POD,
      company,
      print,
      toast,
      columns: exportColumns,
      rows,
      documentTitle: 'POD List',
      summary: `${paged.total.toLocaleString('en-IN')} record(s)`,
    })
  }, [rows, paged.total, company, print, toast, exportColumns])

  useKeyboardPageActions({
    onNewF2: () => navigate('/operations/delivery/pod'),
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
        title="POD (Proof of Delivery) List"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'POD Management', path: '/operations/delivery/pod/list' },
          { label: 'POD List' },
        ]}
      />
      <div className="pod-list-page flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2 sm:p-3">
          <OpsListActionBar
            newLabel="New POD"
            activeFilterCount={activeFilterCount}
            onNew={() => navigate('/operations/delivery/pod')}
            onSearch={openFilterDrawer}
            onFilter={openFilterDrawer}
            onExport={handleExport}
            onPrint={handlePrintList}
            onManageColumns={() => setColumnsSignal((n) => n + 1)}
            onRefresh={refreshList}
          />
          <LrListKpiCards cards={kpiCards} />
          <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter POD" width="md">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Date From" type="date" value={draftFilters.dateFrom} onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
              <Input label="Date To" type="date" value={draftFilters.dateTo} onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))} />
              <Input label="LR No." value={draftFilters.lrNo} onChange={(e) => setDraftFilters((f) => ({ ...f, lrNo: e.target.value }))} />
              <Input label="Trip No." value={draftFilters.tripNo} onChange={(e) => setDraftFilters((f) => ({ ...f, tripNo: e.target.value }))} />
              <Input label="Customer" value={draftFilters.customer} onChange={(e) => setDraftFilters((f) => ({ ...f, customer: e.target.value }))} />
              <Input label="Branch" value={draftFilters.branch} onChange={(e) => setDraftFilters((f) => ({ ...f, branch: e.target.value }))} />
              <Select label="POD Status" options={['(All)', 'Pending', 'Delivered', 'Received']} value={draftFilters.podStatus} onChange={(e) => setDraftFilters((f) => ({ ...f, podStatus: e.target.value }))} />
              <Select label="Verification Status" options={['(All)', 'Pending', 'Verified']} value={draftFilters.verificationStatus} onChange={(e) => setDraftFilters((f) => ({ ...f, verificationStatus: e.target.value }))} />
              <Input label="Delivery Date" type="date" value={draftFilters.deliveryDate} onChange={(e) => setDraftFilters((f) => ({ ...f, deliveryDate: e.target.value }))} />
              <Input label="From / Origin" value={draftFilters.fromCity} onChange={(e) => setDraftFilters((f) => ({ ...f, fromCity: e.target.value }))} />
              <Input label="To / Destination" value={draftFilters.toCity} onChange={(e) => setDraftFilters((f) => ({ ...f, toCity: e.target.value }))} />
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
            rowPrintTitle="Print POD"
            exportFilename="pod-list"
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
        <KeyboardShortcutBar shortcuts={POD_SHORTCUTS} />
      </div>
    </div>
  )
}
