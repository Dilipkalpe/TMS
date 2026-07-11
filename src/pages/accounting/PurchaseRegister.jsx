import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function PurchaseRegister() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useApiResource(() => accountingApi.purchaseRegister())
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
      onAdd={() => navigate(addRecordRoutes.expense)}
      module="Accounting"
      title="Purchase Register"
      statusCards={registerStatusCards('Total Bills', data.length, 'orange', 'ShoppingCart')}
      showActions={false}
      searchPlaceholder="Vendor, bill no..."
      searchKeys={['vendor', 'billNo']}
      columns={columns}
      data={data}
      sortKey="date"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      filterRow={<ReportFilterRow showVendor />}
    />
  )
}
