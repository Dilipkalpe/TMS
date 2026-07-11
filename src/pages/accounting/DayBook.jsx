import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function DayBook() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useApiResource(() => accountingApi.dayBook())
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'type', label: 'Type' },
    { key: 'ledger', label: 'Ledger' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Day Book"
      statusCards={registerStatusCards('Total Entries', data.length, 'violet', 'BookOpen')}
      showActions={false}
      searchPlaceholder="Voucher no., ledger..."
      searchKeys={['voucherNo', 'ledger', 'type']}
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
