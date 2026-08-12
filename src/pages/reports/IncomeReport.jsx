import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function IncomeReport() {
  const navigate = useNavigate()
  const initial = useMemo(() => {
    const now = new Date()
    const from = new Date(now.getFullYear(), 0, 1)
    return {
      ...defaultReportFilters(),
      fromDate: `${from.getFullYear()}-01-01`,
    }
  }, [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const load = useCallback(() => reportsApi.income(applied), [applied])
  const { data, loading, error, refresh } = useApiResource(load, [applied.fromDate, applied.toDate, applied.workflow])

  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'lrCount', label: 'LRs', render: (r) => r.lrCount ?? 0 },
    { key: 'bookingCount', label: 'Booking LRs', render: (r) => r.bookingCount ?? 0 },
    { key: 'directCount', label: 'Direct LRs', render: (r) => r.directCount ?? 0 },
    { key: 'bookingFreight', label: 'Booking Freight', render: (r) => formatCurrency(r.bookingFreight ?? 0) },
    { key: 'directFreight', label: 'Direct Freight', render: (r) => formatCurrency(r.directFreight ?? 0) },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'gst', label: 'GST', render: (r) => formatCurrency(r.gst ?? 0) },
    { key: 'total', label: 'Total', render: (r) => <span className="font-semibold text-green-600">{formatCurrency(r.total)}</span> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Income Report"
      statusCards={registerStatusCards('Months', data.length, 'green', 'TrendingUp')}
      showActions={false}
      searchKeys={['month']}
      columns={columns}
      data={data}
      sortKey="month"
      defaultSortDir="asc"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      filterRow={(
        <ReportFilterRow
          showWorkflow
          value={filters}
          onChange={setFilters}
          onApply={(next) => setApplied(toReportQuery(next))}
        />
      )}
    />
  )
}
