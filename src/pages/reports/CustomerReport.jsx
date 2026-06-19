import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { customers } from '../../data/customers'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function CustomerReport() {
  const navigate = useNavigate()
  const columns = [
    { key: 'name', label: 'Customer' },
    { key: 'contact', label: 'Contact' },
    { key: 'totalTrips', label: 'Trips' },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding) },
    { key: 'creditLimit', label: 'Credit Limit', render: (r) => formatCurrency(r.creditLimit) },
    { key: 'ledgerBalance', label: 'Ledger Balance', render: (r) => formatCurrency(r.ledgerBalance) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Customer Report"
      statusCards={registerStatusCards('Total Customers', customers.length, 'blue', 'Users')}
showActions={false}
      searchPlaceholder="Name, contact..."
      searchKeys={['name', 'contact']}
      columns={columns}
      data={customers}
      sortKey="name"
      defaultSortDir="asc"
      filterRow={<ReportFilterRow showCustomer />}
    />
  )
}
