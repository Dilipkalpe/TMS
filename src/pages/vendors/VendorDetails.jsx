import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Tabs from '../../components/ui/Tabs'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiItem, useApiResource } from '../../hooks/useApiResource'
import { vendorsApi, expensesApi, accountingApi } from '../../services/api'
import { ArrowLeft } from 'lucide-react'
import PrintButton from '../../components/print/PrintButton'

export default function VendorDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { item: vendor, loading, error } = useApiItem(vendorsApi.get, id, [id])
  const { data: expenses } = useApiResource(() => expensesApi.list(), [])
  const { data: vendorLedger } = useApiResource(() => accountingApi.vendorLedger(), [])

  const purchaseBills = expenses
    .filter((e) => e.vendor && vendor && e.vendor === vendor.name)
    .map((e) => ({
      billNo: e.id,
      date: e.date,
      amount: e.amount,
      gst: Math.round(e.amount * 0.18),
      total: e.amount + Math.round(e.amount * 0.18),
      status: e.status,
    }))

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

  if (loading) {
    return (
      <ERPContentPage module="Vendors" title="Vendor Details">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  if (error || !vendor) {
    return (
      <ERPContentPage module="Vendors" title="Vendor Details">
        <p className="text-sm text-red-500">{error || 'Vendor not found'}</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/vendors')}>Back</Button>
      </ERPContentPage>
    )
  }

  const printFields = [
    { label: 'Vendor Name', value: vendor.name },
    { label: 'Category', value: vendor.category },
    { label: 'Contact', value: vendor.contact },
    { label: 'Phone', value: vendor.phone },
    { label: 'Email', value: vendor.email },
    { label: 'GST', value: vendor.gst },
    { label: 'Address', value: vendor.address },
    { label: 'Outstanding', value: formatCurrency(vendor.outstanding) },
  ]

  const tabs = [
    { id: 'bills', label: 'Purchase Bills', content: <ERPDataTable columns={billColumns} data={purchaseBills} showActions={false} /> },
    { id: 'ledger', label: 'Ledger', content: <ERPDataTable columns={ledgerColumns} data={vendorLedger} showActions={false} /> },
    { id: 'payments', label: 'Payment History', content: <ERPDataTable columns={ledgerColumns} data={vendorLedger.filter((l) => l.credit > 0)} showActions={false} /> },
  ]

  return (
    <ERPContentPage
      module="Vendors"
      title={vendor.name}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/vendors')}>Back</Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{vendor.category}</span>
            <PrintButton title="Vendor Profile" subtitle={vendor.name} fields={printFields} />
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
