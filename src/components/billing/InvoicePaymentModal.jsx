import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'
import { formatCurrency } from '../ui/ReportFilters'
import { freightInvoicesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { IndianRupee, Loader2 } from 'lucide-react'

const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'Cheque', 'RTGS', 'Card']

/**
 * Collect payment against a freight invoice (Billing List / Invoice details).
 * @param {{ open, onClose, invoice: { id, invoiceNo, customer, customerName, totalAmount, outstanding, balance }, onPaid }}
 */
export default function InvoicePaymentModal({ open, onClose, invoice, onPaid }) {
  const { toast } = useToast()
  const balance = Number(invoice?.outstanding ?? invoice?.balance ?? 0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Cash',
    referenceNo: '',
    remarks: '',
  })

  useEffect(() => {
    if (!open || !invoice) return
    setForm({
      amount: String(balance || ''),
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'Cash',
      referenceNo: '',
      remarks: '',
    })
  }, [open, invoice?.id, balance])

  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!invoice?.id) return
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      toast({ title: 'Enter payment amount', type: 'warning' })
      return
    }
    if (amount > balance + 0.001) {
      toast({ title: 'Amount exceeds outstanding', message: `Max ${formatCurrency(balance)}`, type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const res = await freightInvoicesApi.recordPayment(invoice.id, {
        amount,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        referenceNo: form.referenceNo || undefined,
        remarks: form.remarks || undefined,
      })
      toast({
        title: 'Payment recorded',
        message: `Receipt ${res.receiptNo || ''} · Balance ${formatCurrency(res.invoice?.balance ?? 0)}`,
        type: 'success',
      })
      onPaid?.(res)
      onClose?.()
    } catch (err) {
      toast({ title: 'Payment failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (!invoice) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button icon={saving ? Loader2 : IndianRupee} onClick={handleSave} disabled={saving || balance <= 0}>
            {saving ? 'Saving…' : 'Pay Now'}
          </Button>
        </div>
      )}
    >
      <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Invoice</p>
          <p className="font-semibold">{invoice.invoiceNo || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Customer</p>
          <p className="font-semibold">{invoice.customer || invoice.customerName || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Invoice total</p>
          <p className="font-semibold">{formatCurrency(invoice.totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Outstanding</p>
          <p className="font-semibold text-amber-600">{formatCurrency(balance)}</p>
        </div>
      </div>

      {balance <= 0 ? (
        <p className="text-sm text-emerald-700">This invoice is already fully paid.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Payment Amount (₹) *" type="number" value={form.amount} onChange={(e) => u('amount', e.target.value)} />
          <Input label="Payment Date" type="date" value={form.paymentDate} onChange={(e) => u('paymentDate', e.target.value)} />
          <Select label="Payment Mode" options={PAYMENT_MODES} value={form.paymentMode} onChange={(e) => u('paymentMode', e.target.value)} />
          <Input label="Reference No." value={form.referenceNo} onChange={(e) => u('referenceNo', e.target.value)} placeholder="UTR / Cheque no." />
          <div className="sm:col-span-2">
            <Input label="Remarks" value={form.remarks} onChange={(e) => u('remarks', e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  )
}
