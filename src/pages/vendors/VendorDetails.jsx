import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Tabs from '../../components/ui/Tabs'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { vendors, purchaseBills, vendorLedger } from '../../data/vendors'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { ArrowLeft } from 'lucide-react'

export default function VendorDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vendor = vendors.find((v) => v.id === id) || vendors[0]

  const billColumns = [
    { key: 'billNo', label: 'Bill No.' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'gst', label: 'GST', render: (r) => formatCurrency(r.gst) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  const ledgerColumns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Voucher' },
    { key: 'particular', label: 'Particular' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(Math.abs(r.balance)) },
  ]

  const tabs = [
    { id: 'bills', label: 'Purchase Bills', content: <ERPDataTable fill columns={billColumns} data={purchaseBills} showActions={false} /> },
    { id: 'ledger', label: 'Ledger', content: <ERPDataTable fill columns={ledgerColumns} data={vendorLedger} showActions={false} /> },
    { id: 'payments', label: 'Payment History', content: <ERPDataTable fill columns={ledgerColumns} data={vendorLedger.filter((l) => l.credit > 0)} showActions={false} /> },
  ]

  return (
    <ERPContentPage
      module="Vendors"
      title={vendor.name}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/vendors')}>Back</Button>
          <span className="text-sm text-slate-500">{vendor.category}</span>
        </div>
      }
    >
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden !p-2.5 sm:!p-3">
        <Tabs fill tabs={tabs} />
      </Card>
    </ERPContentPage>
  )
}
