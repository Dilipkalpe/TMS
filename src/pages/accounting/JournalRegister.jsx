import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { journalRegister } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function JournalRegister() {
  const navigate = useNavigate()
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
      statusCards={registerStatusCards('Total Journals', journalRegister.length, 'violet', 'BookOpen')}
      showActions={false}
      searchPlaceholder="Voucher No., ledger, narration..."
      searchKeys={['voucherNo', 'debitLedger', 'creditLedger', 'narration']}
      columns={columns}
      data={journalRegister}
      sortKey="date"
      filterRow={<ReportFilterRow />}
    />
  )
}
