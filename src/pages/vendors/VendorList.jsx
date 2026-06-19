import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import { vendors } from '../../data/vendors'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'

const vendorStatusCards = (data) => {
  const totalOutstanding = data.reduce((s, v) => s + v.outstanding, 0)
  return [
    { label: 'Total Vendors', color: 'blue', icon: 'Building2', count: data.length },
    { label: 'With Outstanding', color: 'orange', icon: 'AlertTriangle', count: data.filter((v) => v.outstanding > 0).length },
    { label: 'Total Bills', color: 'violet', icon: 'Receipt', count: data.reduce((s, v) => s + v.totalBills, 0) },
    { label: 'Outstanding', color: 'red', icon: 'IndianRupee', count: formatCurrency(totalOutstanding) },
  ]
}

export default function VendorList() {
  const navigate = useNavigate()

  const columns = [
    { key: 'name', label: 'Vendor' },
    { key: 'contact', label: 'Contact' },
    { key: 'category', label: 'Category' },
    { key: 'phone', label: 'Phone' },
    { key: 'totalBills', label: 'Bills' },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.vendors)}
      module="Vendors"
      title="Vendor Management"
      statusCards={vendorStatusCards(vendors)}
      
      searchPlaceholder="Name, category, contact..."
      searchKeys={['name', 'category', 'contact', 'phone']}
      filterOptions={['(All)', 'Fuel', 'Maintenance', 'Toll', 'Office']}
      filterKey="category"
      columns={columns}
      data={vendors}
      sortKey="name"
      onRowClick={(r) => navigate(`/vendors/${r.id}`)}
      onEdit={(r) => navigate(`/vendors/${r.id}`)}
    />
  )
}
