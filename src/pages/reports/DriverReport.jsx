import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { drivers } from '../../data/drivers'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function DriverReport() {
  const navigate = useNavigate()
  const columns = [
    { key: 'name', label: 'Driver' },
    { key: 'license', label: 'License' },
    { key: 'trips', label: 'Trips' },
    { key: 'salary', label: 'Salary', render: (r) => formatCurrency(r.salary) },
    { key: 'advance', label: 'Advance', render: (r) => formatCurrency(r.advance) },
    { key: 'rating', label: 'Rating', render: (r) => `⭐ ${r.rating}` },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Driver Report"
      statusCards={registerStatusCards('Total Drivers', drivers.length, 'violet', 'UserCircle')}
showActions={false}
      searchPlaceholder="Name, license..."
      searchKeys={['name', 'license']}
      columns={columns}
      data={drivers}
      sortKey="name"
      defaultSortDir="asc"
      filterRow={<ReportFilterRow />}
    />
  )
}
