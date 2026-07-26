import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { serverListProps } from '../../utils/serverListProps'

export default function SalesRegister() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => accountingApi.salesRegister(buildListParams({ page, pageSize, search })),
    [],
  )
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'lrNo', label: 'Invoice / LR No.' },
    { key: 'customer', label: 'Customer' },
    { key: 'route', label: 'Route / Booking' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'gst', label: 'GST', render: (r) => formatCurrency(r.gst) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'balance', label: 'Balance', render: (r) => (r.balance != null ? formatCurrency(r.balance) : '—') },
    { key: 'status', label: 'Status' },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.lr)}
      module="Accounting"
      title="Sales Register"
      statusCards={registerStatusCards('Total Sales', paged.total, 'green', 'TrendingUp')}
      showActions={false}
      searchPlaceholder="LR no., customer..."
      searchKeys={['lrNo', 'customer', 'route']}
      columns={columns}
      sortKey="date"
      filterRow={<ReportFilterRow showCustomer />}
      {...serverListProps(paged)}
    />
  )
}
