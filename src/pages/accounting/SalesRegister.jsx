import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { salesRegister } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function SalesRegister() {
  const navigate = useNavigate()
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
      statusCards={registerStatusCards('Total Sales', salesRegister.length, 'green', 'TrendingUp')}
showActions={false}
      searchPlaceholder="LR No., customer, route..."
      searchKeys={['lrNo', 'customer', 'route']}
      columns={columns}
      data={salesRegister}
      sortKey="date"
      filterRow={<ReportFilterRow />}
    />
  )
}
