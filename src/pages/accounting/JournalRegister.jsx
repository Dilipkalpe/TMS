import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function JournalRegister() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useApiResource(() => accountingApi.journalRegister())
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'debitLedger', label: 'Debit Ledger' },
    { key: 'creditLedger', label: 'Credit Ledger' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'narration', label: 'Narration' },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Journal Register"
      statusCards={registerStatusCards('Total Entries', data.length, 'orange', 'FileText')}
      showActions={false}
      searchPlaceholder="Voucher no., narration..."
      searchKeys={['voucherNo', 'narration', 'debitLedger']}
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
