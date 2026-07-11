import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function BankBook() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useApiResource(() => accountingApi.bankBook())
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
      statusCards={registerStatusCards('Total Entries', data.length, 'blue', 'Landmark')}
      showActions={false}
      searchPlaceholder="Particular..."
      searchKeys={['particular']}
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
