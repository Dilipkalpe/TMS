import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { bankBook } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function BankBook() {
  const navigate = useNavigate()
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'particular', label: 'Particular' },
    { key: 'deposit', label: 'Deposit', render: (r) => (r.deposit ? formatCurrency(r.deposit) : '-') },
    { key: 'withdrawal', label: 'Withdrawal', render: (r) => (r.withdrawal ? formatCurrency(r.withdrawal) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Bank Book"
      statusCards={registerStatusCards('Total Entries', bankBook.length, 'blue', 'Landmark')}
showActions={false}
      searchPlaceholder="Particular..."
      searchKeys={['particular']}
      columns={columns}
      data={bankBook}
      sortKey="date"
      filterRow={<ReportFilterRow />}
    />
  )
}
