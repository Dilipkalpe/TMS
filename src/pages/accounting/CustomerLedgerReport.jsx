import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { customerLedger } from '../../data/customers'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function CustomerLedgerReport() {
  const navigate = useNavigate()
  const opening = customerLedger[0]?.balance || 0
  const closing = customerLedger[customerLedger.length - 1]?.balance || 0

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Voucher No.' },
    { key: 'particular', label: 'Particular' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  const statusCards = [
    { label: 'Opening Balance', color: 'blue', icon: 'FolderOpen', count: formatCurrency(opening) },
    { label: 'Transactions', color: 'violet', icon: 'FileText', count: customerLedger.length - 1 },
    { label: 'Closing Balance', color: 'green', icon: 'CheckCircle', count: formatCurrency(closing) },
    { label: 'Total Entries', color: 'orange', icon: 'BookOpen', count: customerLedger.length },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Customer Ledger Report"
      statusCards={statusCards}
showActions={false}
      searchPlaceholder="Voucher, particular..."
      searchKeys={['voucher', 'particular']}
      columns={columns}
      data={customerLedger}
      sortKey="date"
      filterRow={<ReportFilterRow showCustomer />}
    />
  )
}
