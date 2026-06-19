import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge from '../../components/ui/Badge'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { dayBook } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function DayBook() {
  const navigate = useNavigate()
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'type', label: 'Type', render: (r) => <Badge variant="info">{r.type}</Badge> },
    { key: 'ledger', label: 'Ledger' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Day Book"
      statusCards={registerStatusCards('Total Entries', dayBook.length, 'violet', 'CalendarDays')}
showActions={false}
      searchPlaceholder="Voucher No., ledger..."
      searchKeys={['voucherNo', 'ledger', 'type']}
      columns={columns}
      data={dayBook}
      sortKey="date"
      filterRow={<ReportFilterRow />}
    />
  )
}
