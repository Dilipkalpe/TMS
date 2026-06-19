import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { ledgerTransactions } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function LedgerReport() {
  const navigate = useNavigate()
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'particular', label: 'Particular' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Ledger Report"
      statusCards={registerStatusCards('Total Transactions', ledgerTransactions.length, 'blue', 'BookOpen')}
showActions={false}
      searchPlaceholder="Voucher No., particular..."
      searchKeys={['voucherNo', 'particular']}
      columns={columns}
      data={ledgerTransactions}
      sortKey="date"
      filterRow={<ReportFilterRow showLedger showCustomer showVendor />}
    />
  )
}
