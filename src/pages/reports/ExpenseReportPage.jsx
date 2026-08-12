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

export default function ExpenseReportPage() {
  const navigate = useNavigate()
  const initial = useMemo(() => {
    const now = new Date()
    return {
      ...defaultReportFilters(),
      fromDate: `${now.getFullYear()}-01-01`,
    }
  }, [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const load = useCallback(() => reportsApi.expenses(applied), [applied])
  const { data, loading, error, refresh } = useApiResource(load, [applied.fromDate, applied.toDate])

  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'fuel', label: 'Fuel', render: (r) => formatCurrency(r.fuel) },
    { key: 'salary', label: 'Salary', render: (r) => formatCurrency(r.salary ?? 0) },
    { key: 'toll', label: 'Toll', render: (r) => formatCurrency(r.toll ?? 0) },
    { key: 'maintenance', label: 'Maintenance', render: (r) => formatCurrency(r.maintenance ?? 0) },
    { key: 'lrExpenses', label: 'LR Expenses', render: (r) => formatCurrency(r.lrExpenses ?? 0) },
    { key: 'bookingExpenses', label: 'Booking Exp.', render: (r) => formatCurrency(r.bookingExpenses ?? 0) },
    { key: 'total', label: 'Total', render: (r) => <span className="font-semibold text-red-500">{formatCurrency(r.total)}</span> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Expense Report"
      statusCards={registerStatusCards('Months', data.length, 'red', 'TrendingDown')}
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
          value={filters}
          onChange={setFilters}
          onApply={(next) => setApplied(toReportQuery(next))}
        />
      )}
    />
  )
}
