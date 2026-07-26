import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { serverListProps } from '../../utils/serverListProps'

export default function CashBook() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => accountingApi.cashBook(buildListParams({ page, pageSize, search })),
    [],
  )
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'particular', label: 'Particular' },
    { key: 'receipt', label: 'Receipt', render: (r) => (r.receipt ? formatCurrency(r.receipt) : '-') },
    { key: 'payment', label: 'Payment', render: (r) => (r.payment ? formatCurrency(r.payment) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Cash Book"
      statusCards={registerStatusCards('Total Entries', paged.total, 'green', 'Banknote')}
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
