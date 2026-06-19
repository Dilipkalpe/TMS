import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { receiptRegister } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function ReceiptRegister() {
  const navigate = useNavigate()
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'party', label: 'Party' },
    { key: 'mode', label: 'Mode' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'narration', label: 'Narration' },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Receipt Register"
      statusCards={registerStatusCards('Total Receipts', receiptRegister.length, 'green', 'ArrowDownLeft')}
showActions={false}
      searchPlaceholder="Voucher No., party..."
      searchKeys={['voucherNo', 'party', 'narration']}
      columns={columns}
      data={receiptRegister}
      sortKey="date"
      filterRow={<ReportFilterRow />}
    />
  )
}
