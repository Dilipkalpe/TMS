import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { useApiResource } from '../../hooks/useApiResource'
import { reportsApi } from '../../services/api'

export default function TripReport() {
  const navigate = useNavigate()
  const { data: tripReport, loading, error, refresh } = useApiResource(() => reportsApi.trips(), [])

  const columns = [
    { key: 'lr', label: 'LR No.' },
    { key: 'date', label: 'Date' },
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
      statusCards={registerStatusCards('Total Trips', tripReport.length, 'violet', 'Route')}
      showActions={false}
      searchPlaceholder="LR No., vehicle, driver..."
      searchKeys={['lr', 'vehicle', 'driver', 'route']}
      columns={columns}
      data={tripReport}
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      sortKey="date"
      filterRow={<ReportFilterRow />}
    />
  )
}
