import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function ExpenseReportPage() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useApiResource(() => reportsApi.expenses())
  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'fuel', label: 'Fuel', render: (r) => formatCurrency(r.fuel) },
    { key: 'salary', label: 'Salary', render: (r) => formatCurrency(r.salary ?? 0) },
    { key: 'toll', label: 'Toll', render: (r) => formatCurrency(r.toll ?? 0) },
    { key: 'maintenance', label: 'Maintenance', render: (r) => formatCurrency(r.maintenance ?? 0) },
    { key: 'total', label: 'Total', render: (r) => <span className="font-semibold text-red-500">{formatCurrency(r.total)}</span> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Expense Report"
      statusCards={registerStatusCards('Total Months', data.length, 'red', 'TrendingDown')}
      showActions={false}
      searchKeys={['month']}
      columns={columns}
      data={data}
      sortKey="month"
      defaultSortDir="asc"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      filterRow={<ReportFilterRow />}
    />
  )
}
