import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { trialBalance } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function TrialBalance() {
  const navigate = useNavigate()
  const totalDebit = trialBalance.reduce((s, r) => s + r.debit, 0)
  const totalCredit = trialBalance.reduce((s, r) => s + r.credit, 0)

  const columns = [
    { key: 'account', label: 'Account Name' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
  ]

  const statusCards = [
    { label: 'Accounts', color: 'blue', icon: 'BookOpen', count: trialBalance.length },
    { label: 'Total Debit', color: 'green', icon: 'TrendingUp', count: formatCurrency(totalDebit) },
    { label: 'Total Credit', color: 'orange', icon: 'TrendingDown', count: formatCurrency(totalCredit) },
    { label: 'Balanced', color: totalDebit === totalCredit ? 'green' : 'red', icon: 'CheckCircle', count: totalDebit === totalCredit ? 'Yes' : 'No' },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Trial Balance"
      statusCards={statusCards}
showActions={false}
      searchPlaceholder="Account name..."
      searchKeys={['account']}
      columns={columns}
      data={trialBalance}
      sortKey="account"
      defaultSortDir="asc"
      filterRow={<ReportFilterRow />}
    />
  )
}
