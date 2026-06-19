import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { vendors } from '../../data/vendors'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function VendorReport() {
  const navigate = useNavigate()
  const columns = [
    { key: 'name', label: 'Vendor' },
    { key: 'category', label: 'Category' },
    { key: 'totalBills', label: 'Bills' },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding) },
    { key: 'phone', label: 'Contact' },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Vendor Report"
      statusCards={registerStatusCards('Total Vendors', vendors.length, 'orange', 'Building2')}
showActions={false}
      searchPlaceholder="Name, category..."
      searchKeys={['name', 'category']}
      columns={columns}
      data={vendors}
      sortKey="name"
      defaultSortDir="asc"
      filterRow={<ReportFilterRow showVendor />}
    />
  )
}
