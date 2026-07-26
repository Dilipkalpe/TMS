import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { serverListProps } from '../../utils/serverListProps'

export default function TripReport() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.trips(buildListParams({ page, pageSize, search })),
    [],
  )

  const columns = [
    { key: 'lr', label: 'LR No.' },
    { key: 'date', label: 'LR Date' },
    { key: 'deliveryDate', label: 'Delivery Date', render: (r) => r.deliveryDate || '—' },
    {
      key: 'deliveryDays',
      label: 'Delivery Days',
      render: (r) => (r.deliveryDays == null ? '—' : `${r.deliveryDays}`),
    },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'driver', label: 'Driver' },
    { key: 'route', label: 'Route' },
    { key: 'distance', label: 'Distance' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'expense', label: 'Expense', render: (r) => formatCurrency(r.expense) },
    { key: 'profit', label: 'Profit', render: (r) => <span className="font-semibold text-green-600">{formatCurrency(r.profit)}</span> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.bookings)}
      module="Reports"
      title="Trip Report"
      statusCards={registerStatusCards('Total Trips', paged.total, 'violet', 'Route')}
      showActions={false}
      searchPlaceholder="LR No., vehicle, driver..."
      searchKeys={['lr', 'vehicle', 'driver', 'route', 'deliveryDate']}
      columns={columns}
      sortKey="date"
      filterRow={<ReportFilterRow />}
      {...serverListProps(paged)}
    />
  )
}
