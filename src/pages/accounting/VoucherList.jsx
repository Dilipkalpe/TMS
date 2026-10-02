import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Columns3, Download, Filter, Plus, Printer, RefreshCw, Search,
} from 'lucide-react'
import ERPListPage from '../../components/ui/ERPListPage'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Input, { Select } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import SlideDrawer from '../../components/ui/SlideDrawer'
import LrListKpiCards from '../../components/lr/LrListKpiCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { accountingApi, glApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { serverListProps } from '../../utils/serverListProps'
import { withBranchColumn } from '../../utils/branchColumns'
import { exportToCsv } from '../../utils/export'
import { buildStandardRowActions } from '../../components/ui/TableRowActions'

const EMPTY_FILTERS = {
  from: '',
  to: '',
  voucherType: '(All)',
  ledgerId: '',
  status: '(All)',
}

function countActiveFilters(f) {
  let n = 0
  if (f.from) n += 1
  if (f.to) n += 1
  if (f.voucherType && f.voucherType !== '(All)') n += 1
  if (f.ledgerId) n += 1
  if (f.status && f.status !== '(All)') n += 1
  return n
}

function VoucherListActionBar({
  onNew,
  onSearch,
  onExport,
  onPrint,
  onManageColumns,
  onRefresh,
  onFilter,
  activeFilterCount = 0,
}) {
  const btn =
    'inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary/30 hover:bg-slate-50 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
  const filterBtn = activeFilterCount > 0
    ? 'inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/15 sm:text-sm'
    : btn

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          + Add Voucher
          <span className="hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold sm:inline">F2</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={btn} onClick={onSearch}>
          <Search className="h-4 w-4 text-primary" />
          Search
          <span className="hidden text-[10px] text-slate-400 sm:inline">(F3)</span>
        </button>
        <button type="button" className={btn} onClick={onExport}>
          <Download className="h-4 w-4 text-green-600" />
          Export Excel
        </button>
        <button type="button" className={btn} onClick={onPrint}>
          <Printer className="h-4 w-4 text-slate-500" />
          Print
        </button>
        <button type="button" className={btn} onClick={onManageColumns}>
          <Columns3 className="h-4 w-4 text-slate-500" />
          Column
        </button>
        <button type="button" className={filterBtn} onClick={onFilter}>
          <Filter className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <button type="button" className={btn} onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 text-slate-500" />
          Refresh
        </button>
      </div>
    </div>
  )
}

export default function VoucherList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const searchInputRef = useRef(null)
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [columnsSignal, setColumnsSignal] = useState(0)
  const [voucherTypes, setVoucherTypes] = useState([])
  const [ledgers, setLedgers] = useState([])
  const [kpis, setKpis] = useState({ total: 0, posted: 0, draft: 0, reversed: 0 })

  useEffect(() => {
    Promise.all([
      accountingApi.voucherTypes().catch(() => ['Payment Voucher', 'Receipt Voucher', 'Journal Voucher', 'Contra Voucher']),
      accountingApi.ledgerMaster({ pageSize: 500 }).catch(() => ({ items: [] })),
    ]).then(([types, masters]) => {
      setVoucherTypes(Array.isArray(types) ? types : [])
      setLedgers(masters?.items || masters || [])
    })
  }, [])

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => {
      const params = buildListParams({ page, pageSize, search })
      if (applied.from) params.from = applied.from
      if (applied.to) params.to = applied.to
      if (applied.voucherType && applied.voucherType !== '(All)') params.voucherType = applied.voucherType
      if (applied.ledgerId) params.ledgerId = applied.ledgerId
      if (applied.status && applied.status !== '(All)') params.status = applied.status
      return glApi.vouchers(params)
    },
    [applied],
  )

  useEffect(() => {
    Promise.all([
      glApi.vouchers({ page: 1, pageSize: 1, includeTotal: true }).catch(() => ({ total: 0 })),
      glApi.vouchers({ page: 1, pageSize: 1, status: 'POSTED', includeTotal: true }).catch(() => ({ total: 0 })),
      glApi.vouchers({ page: 1, pageSize: 1, status: 'DRAFT', includeTotal: true }).catch(() => ({ total: 0 })),
      glApi.vouchers({ page: 1, pageSize: 1, status: 'REVERSED', includeTotal: true }).catch(() => ({ total: 0 })),
    ]).then(([all, posted, draft, reversed]) => {
      setKpis({
        total: all?.total ?? 0,
        posted: posted?.total ?? 0,
        draft: draft?.total ?? 0,
        reversed: reversed?.total ?? 0,
      })
    })
  }, [paged.total, applied])

  const ledgerOpts = useMemo(() => [
    { value: '', label: 'All ledgers' },
    ...ledgers.map((l) => ({ value: l.id || '', label: l.code ? `${l.code} — ${l.name}` : l.name })).filter((o) => o.value),
  ], [ledgers])

  const typeOpts = useMemo(() => [
    { value: '(All)', label: 'All types' },
    ...voucherTypes.map((t) => ({ value: t, label: t })),
  ], [voucherTypes])

  const applyStatusFilter = (status) => {
    const next = { ...EMPTY_FILTERS, status }
    setDraftFilters(next)
    setApplied(next)
    paged.setPage(1)
  }

  const kpiCards = [
    { label: 'Total Vouchers', count: kpis.total || paged.total, icon: 'FileText', color: 'blue', onClick: () => applyStatusFilter('(All)') },
    { label: 'Posted', count: kpis.posted, icon: 'CheckCircle2', color: 'green', onClick: () => applyStatusFilter('POSTED') },
    { label: 'Draft', count: kpis.draft, icon: 'Clock', color: 'orange', onClick: () => applyStatusFilter('DRAFT') },
    { label: 'Reversed', count: kpis.reversed, icon: 'Undo2', color: 'violet', onClick: () => applyStatusFilter('REVERSED') },
    { label: 'On Page', count: paged.items.length, icon: 'Layers', color: 'teal' },
  ]

  const handleDelete = useCallback(async (r) => {
    if (!window.confirm('Are you sure you want to delete this voucher?')) return
    try {
      await glApi.deleteVoucher(r.id, { remarks: 'Deleted from voucher list' })
      toast({
        title: r.status === 'DRAFT' ? 'Deleted' : 'Cancelled',
        message: r.status === 'DRAFT'
          ? 'Draft voucher deleted.'
          : 'Posted voucher was reversed/cancelled so ledger balances stay correct.',
        type: 'success',
      })
      paged.refresh()
    } catch (err) {
      toast({ title: 'Delete failed', message: err.message, type: 'error' })
    }
  }, [paged, toast])

  const columns = useMemo(() => withBranchColumn([
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'voucherDate', label: 'Voucher Date', render: (r) => r.voucherDate || r.date || '—' },
    { key: 'voucherType', label: 'Voucher Type' },
    { key: 'referenceNo', label: 'Reference No.', render: (r) => r.referenceNo || '—' },
    { key: 'account', label: 'Account / Ledger', render: (r) => r.account || r.ledger || '—' },
    { key: 'narration', label: 'Narration', render: (r) => r.narration || '—' },
    { key: 'totalDebit', label: 'Total Debit', render: (r) => formatCurrency(r.totalDebit ?? r.totalAmount) },
    { key: 'totalCredit', label: 'Total Credit', render: (r) => formatCurrency(r.totalCredit ?? r.totalAmount) },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <Badge variant={statusVariant(r.status === 'POSTED' ? 'Paid' : r.status === 'DRAFT' ? 'Pending' : 'Cancelled')}>
          {r.status}
        </Badge>
      ),
    },
    { key: 'createdBy', label: 'Created By', render: (r) => r.createdBy || '—' },
    { key: 'createdDate', label: 'Created Date', render: (r) => r.createdDate || (r.createdAt ? String(r.createdAt).slice(0, 16).replace('T', ' ') : '—') },
  ], { afterKey: 'voucherNo' }), [])

  const rowActions = useMemo(() => buildStandardRowActions({
    onView: (r) => navigate(`/accounting/vouchers/${r.id}`),
    onEdit: (r) => {
      if (r.status === 'REVERSED') {
        toast({ title: 'Cannot edit', message: 'Reversed vouchers cannot be edited.', type: 'warning' })
        return
      }
      navigate(`/accounting/voucher-entry?id=${r.id}`)
    },
    onDelete: handleDelete,
  }), [navigate, toast, handleDelete])

  const activeFilterCount = countActiveFilters(applied)

  const applyFilters = () => {
    paged.setPage(1)
    setApplied({ ...draftFilters })
    setFilterOpen(false)
  }

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    paged.setPage(1)
    paged.setSearch('')
  }

  const handleExport = () => {
    const cols = columns.map((c) => ({ key: c.key, label: c.label }))
    const rows = paged.items.map((r) => ({
      ...r,
      voucherDate: r.voucherDate || r.date || '',
      account: r.account || r.ledger || '',
      totalDebit: r.totalDebit ?? r.totalAmount,
      totalCredit: r.totalCredit ?? r.totalAmount,
      createdDate: r.createdDate || '',
    }))
    const ok = exportToCsv(rows, cols, 'voucher-list.csv')
    toast({ title: ok ? 'Export complete' : 'Nothing to export', type: ok ? 'success' : 'warning' })
  }

  const tableToolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/40">
      <div className="flex items-center gap-2">
        <span className="text-slate-500">Show</span>
        <select
          className="rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
          value={paged.pageSize}
          onChange={(e) => paged.setPageSize(Number(e.target.value))}
        >
          {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-slate-500">entries</span>
      </div>
      <div className="font-medium text-slate-600 dark:text-slate-300">
        Total: {(paged.total || 0).toLocaleString('en-IN')} voucher(s)
      </div>
    </div>
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F2') { e.preventDefault(); navigate('/accounting/voucher-entry') }
      if (e.key === 'F3') { e.preventDefault(); searchInputRef.current?.focus?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <ERPPageTitle module="Accounting" title="Voucher List" />

      <VoucherListActionBar
        onNew={() => navigate('/accounting/voucher-entry')}
        onSearch={() => searchInputRef.current?.focus?.()}
        onExport={handleExport}
        onPrint={() => window.print()}
        onManageColumns={() => setColumnsSignal((n) => n + 1)}
        onRefresh={() => paged.refresh()}
        onFilter={() => setFilterOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      <LrListKpiCards cards={kpiCards} />

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-primary">Active filters:</span>
          {applied.from && <span className="rounded bg-white px-2 py-0.5 dark:bg-slate-800">From {applied.from}</span>}
          {applied.to && <span className="rounded bg-white px-2 py-0.5 dark:bg-slate-800">To {applied.to}</span>}
          {applied.voucherType !== '(All)' && <span className="rounded bg-white px-2 py-0.5 dark:bg-slate-800">{applied.voucherType}</span>}
          {applied.status !== '(All)' && <span className="rounded bg-white px-2 py-0.5 dark:bg-slate-800">{applied.status}</span>}
          <button type="button" className="ml-auto text-primary hover:underline" onClick={clearFilters}>Clear</button>
        </div>
      )}

      <div className="relative">
        <input
          ref={searchInputRef}
          type="search"
          value={paged.search}
          onChange={(e) => paged.setSearch(e.target.value)}
          placeholder="Search voucher no., narration, reference, ledger..."
          className="mb-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-900"
        />
      </div>

      <ERPListPage
        hideToolbar
        tableToolbar={tableToolbar}
        openColumnsSignal={columnsSignal}
        onView={(r) => navigate(`/accounting/vouchers/${r.id}`)}
        onEdit={(r) => {
          if (r.status === 'REVERSED') {
            toast({ title: 'Cannot edit', message: 'Reversed vouchers cannot be edited.', type: 'warning' })
            return
          }
          navigate(`/accounting/voucher-entry?id=${r.id}`)
        }}
        onRowClick={(r) => navigate(`/accounting/vouchers/${r.id}`)}
        onDelete={handleDelete}
        rowActions={rowActions}
        module="Accounting"
        title={undefined}
        searchPlaceholder="Voucher no., narration, reference, ledger..."
        columns={columns}
        sortKey="voucherDate"
        printable
        exportFilename="voucher-list.csv"
        {...serverListProps(paged)}
        onServerSearch={undefined}
        searchValue={undefined}
      />

      <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter vouchers" width="max-w-md">
        <div className="space-y-3 p-1">
          <Input label="Date From" type="date" value={draftFilters.from} onChange={(e) => setDraftFilters((f) => ({ ...f, from: e.target.value }))} />
          <Input label="Date To" type="date" value={draftFilters.to} onChange={(e) => setDraftFilters((f) => ({ ...f, to: e.target.value }))} />
          <Select label="Voucher Type" options={typeOpts} value={draftFilters.voucherType} onChange={(e) => setDraftFilters((f) => ({ ...f, voucherType: e.target.value }))} />
          <Select label="Account / Ledger" options={ledgerOpts} value={draftFilters.ledgerId} onChange={(e) => setDraftFilters((f) => ({ ...f, ledgerId: e.target.value }))} />
          <Select
            label="Status"
            options={[
              { value: '(All)', label: 'Active (excl. reversed)' },
              { value: 'DRAFT', label: 'DRAFT' },
              { value: 'POSTED', label: 'POSTED' },
              { value: 'REVERSED', label: 'REVERSED' },
            ]}
            value={draftFilters.status}
            onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" className="flex-1" onClick={applyFilters}>Search</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={clearFilters}>Clear Filter</Button>
          </div>
        </div>
      </SlideDrawer>
    </div>
  )
}
