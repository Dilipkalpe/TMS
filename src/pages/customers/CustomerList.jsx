import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import { customers } from '../../data/customers'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'

const customerStatusCards = (data) => {
  const totalOutstanding = data.reduce((s, c) => s + c.outstanding, 0)
  return [
    { label: 'Total Customers', color: 'blue', icon: 'Users', count: data.length },
    { label: 'With Outstanding', color: 'orange', icon: 'AlertTriangle', count: data.filter((c) => c.outstanding > 0).length },
    { label: 'Total Trips', color: 'violet', icon: 'Route', count: data.reduce((s, c) => s + c.totalTrips, 0) },
    { label: 'Outstanding', color: 'red', icon: 'IndianRupee', count: formatCurrency(totalOutstanding) },
  ]
}

export default function CustomerList() {
  const navigate = useNavigate()

  const columns = [
    { key: 'name', label: 'Customer' },
    { key: 'contact', label: 'Contact' },
    { key: 'phone', label: 'Phone' },
    { key: 'gst', label: 'GST No.' },
    { key: 'totalTrips', label: 'Trips' },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding) },
    { key: 'creditLimit', label: 'Credit Limit', render: (r) => formatCurrency(r.creditLimit) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.customers)}
      module="Customers"
      title="Customer Management"
      statusCards={customerStatusCards(customers)}
      
      searchPlaceholder="Name, contact, GST..."
      searchKeys={['name', 'contact', 'phone', 'gst']}
      columns={columns}
      data={customers}
      sortKey="name"
      onRowClick={(r) => navigate(`/customers/${r.id}`)}
      onEdit={(r) => navigate(`/customers/${r.id}`)}
    />
  )
}
