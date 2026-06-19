import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card from '../../components/ui/Card'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Tabs from '../../components/ui/Tabs'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { outstandingCustomers, outstandingVendors } from '../../data/accounting'

export default function OutstandingReport() {
  const customerTotal = outstandingCustomers.reduce((s, r) => s + r.amount, 0)
  const vendorTotal = outstandingVendors.reduce((s, r) => s + r.amount, 0)

  const statusCards = [
    { label: 'Customer Outstanding', color: 'orange', icon: 'Users', count: formatCurrency(customerTotal) },
    { label: 'Vendor Outstanding', color: 'red', icon: 'Building2', count: formatCurrency(vendorTotal) },
    { label: 'Customers', color: 'blue', icon: 'UserCircle', count: outstandingCustomers.length },
    { label: 'Vendors', color: 'violet', icon: 'Truck', count: outstandingVendors.length },
  ]

  const customerColumns = [
    { key: 'name', label: 'Customer' },
    { key: 'amount', label: 'Outstanding', render: (r) => formatCurrency(r.amount) },
    { key: 'days0_30', label: '0-30 Days', render: (r) => formatCurrency(r.days0_30) },
    { key: 'days30_60', label: '30-60 Days', render: (r) => formatCurrency(r.days30_60) },
    { key: 'days60_90', label: '60-90 Days', render: (r) => formatCurrency(r.days60_90) },
    { key: 'days90plus', label: '90+ Days', render: (r) => formatCurrency(r.days90plus) },
  ]

  const vendorColumns = [
    { key: 'name', label: 'Vendor' },
    { key: 'amount', label: 'Outstanding', render: (r) => formatCurrency(r.amount) },
    { key: 'days0_30', label: '0-30 Days', render: (r) => formatCurrency(r.days0_30) },
    { key: 'days30_60', label: '30-60 Days', render: (r) => formatCurrency(r.days30_60) },
    { key: 'days60_90', label: '60-90 Days', render: (r) => formatCurrency(r.days60_90) },
    { key: 'days90plus', label: '90+ Days', render: (r) => formatCurrency(r.days90plus) },
  ]

  const tabs = [
    { id: 'customers', label: 'Customer Wise', content: <ERPDataTable fill columns={customerColumns} data={outstandingCustomers} showActions={false} /> },
    { id: 'vendors', label: 'Vendor Wise', content: <ERPDataTable fill columns={vendorColumns} data={outstandingVendors} showActions={false} /> },
  ]

  return (
    <ERPContentPage module="Accounting" title="Outstanding Report">
      <div className="space-y-4">
        <StatusSummaryCards cards={statusCards} />
        <ReportFilterRow showCustomer showVendor />
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden !p-2.5 sm:!p-3">
          <Tabs fill tabs={tabs} />
        </Card>
      </div>
    </ERPContentPage>
  )
}
