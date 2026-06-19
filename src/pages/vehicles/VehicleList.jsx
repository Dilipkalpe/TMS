import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { vehicles } from '../../data/vehicles'
import { vehicleStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function VehicleList() {
  const navigate = useNavigate()

  const columns = [
    { key: 'number', label: 'Vehicle No.' },
    { key: 'type', label: 'Type' },
    { key: 'model', label: 'Model' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'trips', label: 'Trips' },
    { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.vehicles)}
      module="Vehicles"
      title="Vehicle Management"
      statusCards={vehicleStatusCards(vehicles)}
      
      searchPlaceholder="Vehicle no., type, model..."
      searchKeys={['number', 'type', 'model']}
      filterOptions={['(All)', 'Active', 'Maintenance', 'On Leave']}
      filterKey="status"
      columns={columns}
      data={vehicles}
      sortKey="number"
      onRowClick={(r) => navigate(`/vehicles/${r.id}`)}
      onEdit={(r) => navigate(`/vehicles/${r.id}`)}
    />
  )
}
