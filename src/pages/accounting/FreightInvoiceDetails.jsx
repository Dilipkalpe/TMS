import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { bookingPath } from '../../utils/docPath'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { ArrowLeft, Ban, Loader2, Printer } from 'lucide-react'
import { freightInvoicesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import TransportBillPrint from '../../components/print/TransportBillPrint'

export default function FreightInvoiceDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)

  const reload = () => {
    setLoading(true)
    freightInvoicesApi.get(id)
      .then(setData)
      .catch((err) => toast({ title: 'Load failed', message: err.message, type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [id])

  const inv = data?.invoice
  const lines = data?.lines || []
  const payments = data?.payments || []

  const handlePrint = () => {
    if (!inv) return
    let snapshot = {}
    try {
      snapshot = inv.invoiceData ? JSON.parse(inv.invoiceData) : {}
    } catch { /* ignore */ }
    print(
      <TransportBillPrint
        company={company}
        bill={{
          billNo: inv.invoiceNo,
          billType: inv.billType,
          billDate: inv.invoiceDate,
          customerName: inv.customerName,
          gstin: inv.gstin,
          placeOfSupply: inv.placeOfSupply,
          taxableAmount: inv.taxableAmount,
          gstAmount: inv.gstAmount,
          totalAmount: inv.totalAmount,
          netPayable: inv.balance,
          bookingId: inv.bookingId,
          ...snapshot,
        }}
      />,
    )
  }

  const cancel = async () => {
    if (!window.confirm('Cancel this freight invoice?')) return
    setBusy(true)
    try {
      await freightInvoicesApi.cancel(id)
      toast({ title: 'Invoice cancelled', type: 'success' })
      reload()
    } catch (err) {
      toast({ title: 'Cancel failed', message: err.message, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  if (loading || !inv) {
    return (
      <ERPContentPage module="Accounting" title="Freight Invoice">
        <div className="flex items-center gap-2 p-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage
      module="Accounting"
      title={inv.invoiceNo}
      toolbar={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/accounting/freight-invoices')}>Back</Button>
          <Button variant="outline" icon={Printer} onClick={handlePrint}>Print</Button>
          {inv.bookingId && (
            <Button variant="outline" onClick={() => navigate(bookingPath(inv.bookingId))}>Open Booking</Button>
          )}
          {inv.status !== 'Cancelled' && inv.amountPaid <= 0 && (
            <Button variant="outline" icon={Ban} disabled={busy} onClick={cancel}>Cancel</Button>
          )}
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge>{inv.status}</Badge>
        <span className="text-sm text-slate-500">{inv.billType} · {inv.invoiceDate}</span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-3"><p className="text-xs text-slate-500">Customer</p><p className="font-semibold">{inv.customerName}</p></Card>
        <Card className="p-3"><p className="text-xs text-slate-500">Total</p><p className="font-semibold">{formatCurrency(inv.totalAmount)}</p></Card>
        <Card className="p-3"><p className="text-xs text-slate-500">Paid</p><p className="font-semibold">{formatCurrency(inv.amountPaid)}</p></Card>
        <Card className="p-3"><p className="text-xs text-slate-500">Balance</p><p className="font-semibold">{formatCurrency(inv.balance)}</p></Card>
      </div>

      <Card className="mb-4 p-0">
        <CardHeader title="Lines" />
        <ERPDataTable
          columns={[
            { key: 'description', label: 'Description' },
            { key: 'qty', label: 'Qty' },
            { key: 'rate', label: 'Rate', render: (r) => formatCurrency(r.rate) },
            { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
          ]}
          data={lines}
          showActions={false}
        />
      </Card>

      <Card className="p-0">
        <CardHeader title="Payments" />
        <ERPDataTable
          columns={[
            { key: 'paymentDate', label: 'Date' },
            { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
            { key: 'paymentMode', label: 'Mode' },
            { key: 'referenceNo', label: 'Reference' },
            { key: 'remarks', label: 'Remarks' },
          ]}
          data={payments}
          showActions={false}
          emptyMessage="No payments allocated to this invoice yet."
        />
      </Card>
    </ERPContentPage>
  )
}
