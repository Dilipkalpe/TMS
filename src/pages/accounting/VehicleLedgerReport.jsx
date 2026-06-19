import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { vehicleLedger } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function VehicleLedgerReport() {
  const navigate = useNavigate()
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'fuel', label: 'Fuel', render: (r) => (r.fuel ? formatCurrency(r.fuel) : '-') },
    { key: 'maintenance', label: 'Maintenance', render: (r) => (r.maintenance ? formatCurrency(r.maintenance) : '-') },
    { key: 'tripIncome', label: 'Trip Income', render: (r) => (r.tripIncome ? formatCurrency(r.tripIncome) : '-') },
    { key: 'expenses', label: 'Expenses', render: (r) => (r.expenses ? formatCurrency(r.expenses) : '-') },
    { key: 'netProfit', label: 'Net Profit', render: (r) => <span className="font-semibold text-green-600">{formatCurrency(r.netProfit)}</span> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Vehicle Ledger Report"
      statusCards={registerStatusCards('Total Entries', vehicleLedger.length, 'blue', 'Truck')}
showActions={false}
      columns={columns}
      data={vehicleLedger}
      sortKey="date"
      filterRow={<ReportFilterRow />}
    />
  )
}
