import { useMemo, useState } from 'react'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { serverListProps } from '../../utils/serverListProps'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function DirectLrPlReport() {
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.directLrProfitLoss({
      ...buildListParams({ page, pageSize, search }),
      ...applied,
    }),
    [applied.fromDate, applied.toDate],
  )

  const pageProfit = paged.items.reduce((s, r) => s + (r.profit ?? 0), 0)

  const columns = [
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'lrDate', label: 'Date' },
    { key: 'workflowLabel', label: 'Workflow', render: () => <Badge variant="info">Direct LR</Badge> },
    { key: 'customer', label: 'Consignor', render: (r) => r.customer || '—' },
    { key: 'route', label: 'Route' },
    { key: 'stage', label: 'Stage', render: (r) => <Badge variant={statusVariant(r.status)}>{r.stage || r.status}</Badge> },
    { key: 'income', label: 'Income', render: (r) => formatCurrency(r.income) },
    { key: 'expenses', label: 'LR Expenses', render: (r) => formatCurrency(r.expenses) },
    { key: 'profit', label: 'Profit', render: (r) => (
      <span className={`font-semibold ${(r.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
        {formatCurrency(r.profit)}
      </span>
    ) },
    { key: 'marginPercent', label: 'Margin %', render: (r) => `${r.marginPercent ?? 0}%` },
  ]

  return (
    <ERPListPage
      module="Reports"
      title="Direct LR Profit & Loss"
      statusCards={[
        { label: 'Direct LRs', color: 'violet', icon: 'FileSpreadsheet', count: paged.total },
        { label: 'Profit (page)', color: pageProfit >= 0 ? 'green' : 'red', icon: 'PieChart', count: Math.round(pageProfit) },
      ]}
      showActions={false}
      searchPlaceholder="LR No., consignor, route..."
      columns={columns}
      sortKey="lrDate"
      filterRow={(
        <ReportFilterRow
          value={filters}
          onChange={setFilters}
          onApply={(next) => {
            setApplied(toReportQuery(next))
            paged.setPage(1)
          }}
        />
      )}
      {...serverListProps(paged)}
    />
  )
}
