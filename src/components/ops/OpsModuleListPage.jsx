import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ERPContentPage from '../ui/ERPContentPage'
import ERPListPage from '../ui/ERPListPage'
import Badge, { statusVariant } from '../ui/Badge'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'
import StatusSummaryCards from '../ui/StatusSummaryCards'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { operationsModulesApi } from '../../services/api'
import { MODULE_COLUMN_MAP, MODULE_KPI_MAP } from '../../config/tmsModules'
import { formatCurrency } from '../ui/ReportFilters'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'

function badgeVariant(label) {
  const s = String(label || '').toLowerCase()
  if (s.includes('paid') || s.includes('loaded') || s.includes('verified') || s.includes('received') || s.includes('completed') || s.includes('delivered') || s.includes('approved') || s.includes('billed')) return 'Paid'
  if (s.includes('pending') || s.includes('unpaid') || s.includes('partial')) return 'Pending'
  if (s.includes('active') || s.includes('transit')) return 'outline'
  if (s.includes('cancel')) return 'Cancelled'
  return 'outline'
}

export default function OpsModuleListPage({
  moduleKey,
  title,
  addPath,
  addLabel = 'New',
  onRowOpen,
  lrLinkKey = 'lrNumber',
  searchPlaceholder,
}) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', status: '(All)' })

  const columnDefs = MODULE_COLUMN_MAP[moduleKey] || []
  const kpiDefs = MODULE_KPI_MAP[moduleKey] || []

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => {
      const params = buildListParams({ page, pageSize, search })
      if (filters.dateFrom) params.dateFrom = filters.dateFrom
      if (filters.dateTo) params.dateTo = filters.dateTo
      if (filters.status && filters.status !== '(All)') params.status = filters.status
      if (moduleKey === 'billing' && filters.status !== '(All)') params.paymentStatus = filters.status
      return operationsModulesApi.list(moduleKey, params)
    },
    [moduleKey, filters],
  )

  const reloadSummary = useCallback(() => {
    operationsModulesApi.summary(moduleKey).then(setSummary).catch(() => {})
  }, [moduleKey])

  useEffect(() => { reloadSummary() }, [paged.items.length, reloadSummary])

  const kpiCards = useMemo(() => kpiDefs.map((k) => ({
    label: k.label,
    count: k.money ? formatCurrency(summary[k.field] ?? 0) : (summary[k.field] ?? 0),
    icon: 'Layers',
    color: k.color,
  })), [kpiDefs, summary])

  const columns = useMemo(() => columnDefs.map((col) => ({
      key: col.key,
      label: col.label,
      render: (r) => {
        const val = r[col.key]
        if (col.badge) return <Badge variant={statusVariant(badgeVariant(val))}>{val || '—'}</Badge>
        if (col.money) return formatCurrency(val)
        if (col.key === lrLinkKey && val) {
          return (
            <button type="button" className="font-semibold text-primary hover:underline" onClick={(e) => { e.stopPropagation(); onRowOpen?.(r) ?? navigate(addPath + `?lr=${encodeURIComponent(val)}`) }}>
              {val}
            </button>
          )
        }
        if (typeof val === 'string' && val.includes('T') && val.length > 10) return val.slice(0, 16).replace('T', ' ')
        return val ?? '—'
      },
    })), [columnDefs, lrLinkKey, addPath, navigate, onRowOpen])

  const filterRow = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" icon={Filter} onClick={() => setShowFilters((v) => !v)}>
          Filters {showFilters ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
        </Button>
        <Link to={addPath} className="ml-auto text-xs text-primary hover:underline">+ {addLabel}</Link>
      </div>
      {showFilters && (
        <div className="grid gap-2 rounded-lg border border-primary/15 bg-slate-50/80 p-2 sm:grid-cols-2 lg:grid-cols-4 dark:bg-slate-900/40">
          <Input label="Date From" type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
          <Input label="Date To" type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
          <Select label="Status" options={['(All)', 'Pending', 'Completed', 'Delivered', 'Paid', 'Unpaid', 'Approved']} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} />
          <div className="flex items-end">
            <Button size="sm" onClick={() => { paged.setPage(1); paged.refresh(); reloadSummary() }}>Apply</Button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <ERPContentPage module="Operations" title={title}>
      {kpiCards.length > 0 && (
        <div className="mb-3">
          <StatusSummaryCards cards={kpiCards} />
        </div>
      )}
      <ERPListPage
        module="Operations"
        addLabel={addLabel}
        onAdd={() => navigate(addPath)}
        searchPlaceholder={searchPlaceholder || `Search ${title}…`}
        filterRow={filterRow}
        columns={columns}
        data={paged.items}
        loading={paged.loading}
        error={paged.error}
        onRefreshExternal={() => { paged.refresh(); reloadSummary() }}
        onRowClick={(r) => (onRowOpen ?? ((row) => navigate(addPath + `?lr=${encodeURIComponent(row[lrLinkKey])}`)))(r)}
        onView={(r) => (onRowOpen ?? ((row) => navigate(addPath + `?lr=${encodeURIComponent(row[lrLinkKey])}`)))(r)}
        exportFilename={`${moduleKey}-list`}
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
    </ERPContentPage>
  )
}
