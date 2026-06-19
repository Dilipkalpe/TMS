import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { vehicles } from '../../data/vehicles'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function VehicleReport() {
  const navigate = useNavigate()
  const data = vehicles.map((v) => ({
    number: v.number,
    type: v.type,
    trips: v.trips,
    revenue: v.revenue,
    utilization: Math.round((v.trips / 150) * 100),
    status: v.status,
  }))

  const columns = [
    { key: 'number', label: 'Vehicle' },
    { key: 'type', label: 'Type' },
    { key: 'trips', label: 'Trips' },
    { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
    { key: 'utilization', label: 'Utilization', render: (r) => `${r.utilization}%` },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Vehicle Report"
      statusCards={registerStatusCards('Total Vehicles', data.length, 'blue', 'Truck')}
showActions={false}
      searchPlaceholder="Vehicle no., type..."
      searchKeys={['number', 'type']}
      columns={columns}
      data={data}
      sortKey="number"
      defaultSortDir="asc"
      filterRow={<ReportFilterRow />}
    />
  )
}
