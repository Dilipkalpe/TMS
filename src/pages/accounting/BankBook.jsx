import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { serverListProps } from '../../utils/serverListProps'
import { withBranchColumn } from '../../utils/branchColumns'

export default function BankBook() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => accountingApi.bankBook(buildListParams({ page, pageSize, search })),
    [],
  )
  const columns = withBranchColumn([
    { key: 'date', label: 'Date' },
    { key: 'particular', label: 'Particular' },
    { key: 'deposit', label: 'Deposit', render: (r) => (r.deposit ? formatCurrency(r.deposit) : '-') },
    { key: 'withdrawal', label: 'Withdrawal', render: (r) => (r.withdrawal ? formatCurrency(r.withdrawal) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ], { afterKey: 'date' })

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Bank Book"
      statusCards={registerStatusCards('Total Entries', paged.total, 'blue', 'Landmark')}
      showActions={false}
      searchPlaceholder="Particular..."
      searchKeys={['particular']}
      columns={columns}
      sortKey="date"
      filterRow={<ReportFilterRow />}
      {...serverListProps(paged)}
    />
  )
}
