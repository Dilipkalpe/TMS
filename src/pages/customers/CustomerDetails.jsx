import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Tabs from '../../components/ui/Tabs'
import { customers, customerLedger } from '../../data/customers'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { ArrowLeft } from 'lucide-react'

export default function CustomerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const customer = customers.find((c) => c.id === id) || customers[0]

  const ledgerColumns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Voucher' },
    { key: 'particular', label: 'Particular' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
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
      content: <ERPDataTable fill columns={ledgerColumns} data={customerLedger} showActions={false} />,
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
          <span className="text-sm text-slate-500">{customer.totalTrips} trips completed</span>
        </div>
      }
    >
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden !p-2.5 sm:!p-3">
        <Tabs fill tabs={tabs} />
      </Card>
    </ERPContentPage>
  )
}
