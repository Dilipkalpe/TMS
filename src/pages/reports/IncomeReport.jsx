import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function IncomeReport() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useApiResource(() => reportsApi.income())
  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'loading', label: 'Loading', render: (r) => formatCurrency(r.loading ?? 0) },
    { key: 'total', label: 'Total', render: (r) => <span className="font-semibold text-green-600">{formatCurrency(r.total)}</span> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Income Report"
      statusCards={registerStatusCards('Total Months', data.length, 'green', 'TrendingUp')}
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
