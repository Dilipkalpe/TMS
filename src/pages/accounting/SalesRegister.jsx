import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function SalesRegister() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useApiResource(() => accountingApi.salesRegister())
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'lrNo', label: 'LR No.' },
    { key: 'customer', label: 'Customer' },
    { key: 'route', label: 'Route' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'gst', label: 'GST', render: (r) => formatCurrency(r.gst) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.lr)}
      module="Accounting"
      title="Sales Register"
      statusCards={registerStatusCards('Total Sales', data.length, 'green', 'TrendingUp')}
      showActions={false}
      searchPlaceholder="LR no., customer..."
      searchKeys={['lrNo', 'customer', 'route']}
      columns={columns}
      data={data}
      sortKey="date"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      filterRow={<ReportFilterRow showCustomer />}
    />
  )
}
