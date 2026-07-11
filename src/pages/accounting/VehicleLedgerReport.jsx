import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'

export default function VehicleLedgerReport() {
  const { data, loading, error, refresh } = useApiResource(() => accountingApi.vehicleLedger())
  const columns = [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'date', label: 'Date' },
    { key: 'fuel', label: 'Fuel', render: (r) => formatCurrency(r.fuel) },
    { key: 'maintenance', label: 'Maintenance', render: (r) => formatCurrency(r.maintenance) },
    { key: 'bookingExpenses', label: 'Trip Expenses', render: (r) => formatCurrency(r.bookingExpenses ?? 0) },
    { key: 'brokerCharges', label: 'Broker', render: (r) => formatCurrency(r.brokerCharges ?? 0) },
    { key: 'tripIncome', label: 'Trip Income', render: (r) => formatCurrency(r.tripIncome) },
    { key: 'expenses', label: 'Total Expenses', render: (r) => formatCurrency(r.expenses) },
    { key: 'netProfit', label: 'Net Profit', render: (r) => formatCurrency(r.netProfit) },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  return (
    <ERPListPage
      module="Accounting"
      title="Vehicle Ledger Report"
      statusCards={registerStatusCards('Total Entries', data.length, 'blue', 'Truck')}
      showActions={false}
      searchPlaceholder="Vehicle, date..."
      searchKeys={['vehicle', 'date']}
      columns={columns}
      data={data}
      sortKey="date"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      filterRow={<ReportFilterRow />}
    />
  )
}
