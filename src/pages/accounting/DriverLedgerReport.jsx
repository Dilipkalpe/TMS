import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { driverLedger } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function DriverLedgerReport() {
  const navigate = useNavigate()
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'salary', label: 'Salary', render: (r) => (r.salary ? formatCurrency(r.salary) : '-') },
    { key: 'advance', label: 'Advance', render: (r) => (r.advance ? formatCurrency(r.advance) : '-') },
    { key: 'deduction', label: 'Deduction', render: (r) => (r.deduction ? formatCurrency(r.deduction) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(Math.abs(r.balance)) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Driver Ledger Report"
      statusCards={registerStatusCards('Total Entries', driverLedger.length, 'violet', 'UserCircle')}
showActions={false}
      searchPlaceholder="Type..."
      searchKeys={['type']}
      columns={columns}
      data={driverLedger}
      sortKey="date"
      filterRow={<ReportFilterRow />}
    />
  )
}
