import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { vendorLedger } from '../../data/vendors'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function VendorLedgerReport() {
  const navigate = useNavigate()
  const opening = 35000
  const closing = Math.abs(vendorLedger[vendorLedger.length - 1]?.balance || 0)

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Voucher' },
    { key: 'particular', label: 'Particular' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Closing', render: (r) => formatCurrency(Math.abs(r.balance)) },
  ]

  const statusCards = [
    { label: 'Opening', color: 'blue', icon: 'FolderOpen', count: formatCurrency(opening) },
    { label: 'Total Debit', color: 'orange', icon: 'TrendingUp', count: formatCurrency(177830) },
    { label: 'Total Credit', color: 'green', icon: 'TrendingDown', count: formatCurrency(100000) },
    { label: 'Closing', color: 'violet', icon: 'CheckCircle', count: formatCurrency(closing) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Vendor Ledger Report"
      statusCards={statusCards}
showActions={false}
      searchPlaceholder="Voucher, particular..."
      searchKeys={['voucher', 'particular']}
      columns={columns}
      data={vendorLedger}
      sortKey="date"
      filterRow={<ReportFilterRow showVendor />}
    />
  )
}
