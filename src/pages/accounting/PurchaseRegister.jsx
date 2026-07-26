import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { serverListProps } from '../../utils/serverListProps'

export default function PurchaseRegister() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => accountingApi.purchaseRegister(buildListParams({ page, pageSize, search })),
    [],
  )
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
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Accounting"
      title="Purchase Register"
      statusCards={registerStatusCards('Total Purchases', paged.total, 'violet', 'ShoppingCart')}
      showActions={false}
      searchPlaceholder="Bill no., vendor..."
      searchKeys={['billNo', 'vendor']}
      columns={columns}
      sortKey="date"
      filterRow={<ReportFilterRow showVendor />}
      {...serverListProps(paged)}
    />
  )
}
