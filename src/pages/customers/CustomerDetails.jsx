import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Tabs from '../../components/ui/Tabs'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiItem, useApiResource } from '../../hooks/useApiResource'
import { customersApi, accountingApi } from '../../services/api'
import { ArrowLeft } from 'lucide-react'
import PrintButton from '../../components/print/PrintButton'

export default function CustomerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { item: customer, loading, error } = useApiItem(customersApi.get, id, [id])
  const { data: ledger } = useApiResource(() => accountingApi.customerLedger(id), [id])

  const ledgerColumns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Voucher' },
    { key: 'particular', label: 'Particular' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  if (loading) {
    return (
      <ERPContentPage module="Customers" title="Customer Details">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  if (error || !customer) {
    return (
      <ERPContentPage module="Customers" title="Customer Details">
        <p className="text-sm text-red-500">{error || 'Customer not found'}</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/customers')}>Back</Button>
      </ERPContentPage>
    )
  }

  const printFields = [
    { label: 'Customer Name', value: customer.name },
    { label: 'Contact Person', value: customer.contact },
    { label: 'Phone', value: customer.phone },
    { label: 'Email', value: customer.email },
    { label: 'GST', value: customer.gst },
    { label: 'Address', value: customer.address },
    { label: 'Credit Limit', value: formatCurrency(customer.creditLimit) },
    { label: 'Outstanding', value: formatCurrency(customer.outstanding) },
    { label: 'Total Trips', value: customer.totalTrips },
  ]

  const tabs = [
    {
      id: 'contact',
      label: 'Contact Details',
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Contact Person', value: customer.contact },
            { label: 'Phone', value: customer.phone },
            { label: 'Email', value: customer.email },
            { label: 'GST', value: customer.gst },
            { label: 'Address', value: customer.address },
            { label: 'Credit Limit', value: formatCurrency(customer.creditLimit) },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs text-slate-500">{f.label}</p>
              <p className="font-medium">{f.value}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'ledger',
      label: 'Ledger',
      content: <ERPDataTable columns={ledgerColumns} data={ledger} showActions={false} />,
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      content: (
        <div className="rounded-xl bg-amber-50 p-6 text-center dark:bg-amber-950/30">
          <p className="text-sm text-amber-700 dark:text-amber-400">Total Outstanding</p>
          <p className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-300">{formatCurrency(customer.outstanding)}</p>
        </div>
      ),
    },
  ]

  return (
    <ERPContentPage
      module="Customers"
      title={customer.name}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/customers')}>Back</Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{customer.totalTrips} trips completed</span>
            <PrintButton title="Customer Profile" subtitle={customer.name} fields={printFields} />
          </div>
        </div>
      }
    >
      <Card className="!p-2.5 sm:!p-3">
        <Tabs tabs={tabs} />
      </Card>
    </ERPContentPage>
  )
}
