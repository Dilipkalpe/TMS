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

export default function JournalRegister() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => accountingApi.journalRegister(buildListParams({ page, pageSize, search })),
    [],
  )
  const columns = withBranchColumn([
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'debitLedger', label: 'Debit Ledger' },
    { key: 'creditLedger', label: 'Credit Ledger' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'narration', label: 'Narration' },
  ], { afterKey: 'date' })

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Journal Register"
      statusCards={registerStatusCards('Total Entries', paged.total, 'orange', 'FileText')}
      showActions={false}
      searchPlaceholder="Voucher no., narration..."
      searchKeys={['voucherNo', 'narration', 'debitLedger']}
      columns={columns}
      sortKey="date"
      filterRow={<ReportFilterRow />}
      {...serverListProps(paged)}
    />
  )
}
