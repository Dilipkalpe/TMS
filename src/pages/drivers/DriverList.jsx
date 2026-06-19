import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { drivers } from '../../data/drivers'
import { driverStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function DriverList() {
  const navigate = useNavigate()

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'license', label: 'License No.' },
    { key: 'phone', label: 'Contact' },
    { key: 'salary', label: 'Salary', render: (r) => formatCurrency(r.salary) },
    { key: 'advance', label: 'Advance', render: (r) => formatCurrency(r.advance) },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'trips', label: 'Trips' },
    { key: 'rating', label: 'Rating', render: (r) => `⭐ ${r.rating}` },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.drivers)}
      module="Drivers"
      title="Driver Management"
      statusCards={driverStatusCards(drivers)}
      
      searchPlaceholder="Name, license, phone..."
      searchKeys={['name', 'license', 'phone']}
      filterOptions={['(All)', 'Active', 'On Leave']}
      filterKey="status"
      columns={columns}
      data={drivers}
      sortKey="name"
      onRowClick={(r) => navigate(`/drivers/${r.id}`)}
      onEdit={(r) => navigate(`/drivers/${r.id}`)}
    />
  )
}
