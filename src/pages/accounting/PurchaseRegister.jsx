import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { purchaseRegister } from '../../data/accounting'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function PurchaseRegister() {
  const navigate = useNavigate()
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'billNo', label: 'Bill No.' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'gst', label: 'GST', render: (r) => formatCurrency(r.gst) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.expenses)}
      module="Accounting"
      title="Purchase Register"
      statusCards={registerStatusCards('Total Purchases', purchaseRegister.length, 'orange', 'ShoppingCart')}
showActions={false}
      searchPlaceholder="Bill No., vendor..."
      searchKeys={['billNo', 'vendor']}
      columns={columns}
      data={purchaseRegister}
      sortKey="date"
      filterRow={<ReportFilterRow showVendor />}
    />
  )
}
