import { useCallback, useEffect, useState } from 'react'
import Card, { CardHeader } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select, Textarea } from '../ui/Input'
import ERPDataTable from '../ui/ERPDataTable'
import { formatCurrency } from '../ui/ReportFilters'
import { bookingFinanceApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Plus, Loader2, Printer, Trash2 } from 'lucide-react'
import { usePrint } from '../../context/PrintContext'
import TransportBillPrint from '../print/TransportBillPrint'

const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'Cheque', 'RTGS']
const CHARGE_TYPES = ['Commission', 'Fixed', 'Loading', 'Other']
const EXPENSE_CATS = ['Fuel', 'Toll', 'Hamali', 'Detention', 'Other']

export default function BookingFinancePanel({ bookingId, booking, onBookingChange }) {
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [saving, setSaving] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMode: 'Cash', referenceNo: '', remarks: '' })
  const [brokerForm, setBrokerForm] = useState({ brokerName: '', chargeType: 'Commission', amount: '', remarks: '' })
  const [expenseForm, setExpenseForm] = useState({ category: 'Fuel', amount: '', vendorName: '', description: '' })

  const reload = useCallback(() => {
    if (!bookingId) return
    setLoading(true)
    bookingFinanceApi.summary(bookingId)
      .then((data) => {
        setSummary(data)
        if (data?.booking && onBookingChange) onBookingChange(data.booking)
      })
      .catch((err) => toast({ title: 'Load failed', message: err.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [bookingId, toast, onBookingChange])

  useEffect(() => { reload() }, [reload])

  const submitPayment = async () => {
    const amount = Number(paymentForm.amount)
    if (!amount || amount <= 0) {
      toast({ title: 'Validation', message: 'Enter a valid payment amount.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await bookingFinanceApi.recordPayment(bookingId, { ...paymentForm, amount })
      toast({ title: 'Payment recorded', type: 'success' })
      setPaymentForm({ amount: '', paymentMode: 'Cash', referenceNo: '', remarks: '' })
      reload()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const submitBroker = async () => {
    if (!brokerForm.brokerName?.trim() || !Number(brokerForm.amount)) {
      toast({ title: 'Validation', message: 'Broker name and amount are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await bookingFinanceApi.addBrokerCharge(bookingId, { ...brokerForm, amount: Number(brokerForm.amount) })
      toast({ title: 'Broker charge added', type: 'success' })
      setBrokerForm({ brokerName: '', chargeType: 'Commission', amount: '', remarks: '' })
      reload()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const submitExpense = async () => {
    if (!Number(expenseForm.amount)) {
      toast({ title: 'Validation', message: 'Expense amount is required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await bookingFinanceApi.addExpense(bookingId, { ...expenseForm, amount: Number(expenseForm.amount) })
      toast({ title: 'Expense added', type: 'success' })
      setExpenseForm({ category: 'Fuel', amount: '', vendorName: '', description: '' })
      reload()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const createBill = async (billType) => {
    setSaving(true)
    try {
      const bill = await bookingFinanceApi.createBill(bookingId, { billType, customerName: booking?.customer })
      toast({ title: `${billType} bill created`, message: `${bill.billNo} · Due ${formatCurrency(bill.netPayable ?? bill.totalAmount)}`, type: 'success' })
      reload()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const deleteBill = async (bill) => {
    if (!bill?.id) return
    if (!window.confirm(`Delete bill ${bill.billNo}?`)) return
    setSaving(true)
    try {
      await bookingFinanceApi.deleteBill(bookingId, bill.id)
      toast({ title: 'Bill deleted', message: bill.billNo, type: 'success' })
      reload()
    } catch (err) {
      toast({ title: 'Delete failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading finance data…</p>

  const live = summary?.booking ?? booking
  const pl = summary?.profitLoss ?? {}
  const received = Math.max(0, (live?.freight ?? 0) - (live?.balance ?? 0))
  const paymentCols = [
    { key: 'paymentDate', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'paymentMode', label: 'Mode' },
    { key: 'referenceNo', label: 'Reference' },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Profit & Loss (This Booking)"
          subtitle="Profit = freight income minus broker charges and expenses. Customer payments reduce outstanding, not profit."
        />
        <div className="grid gap-3 sm:grid-cols-4">
          <div><p className="text-xs text-slate-500">Freight Income</p><p className="font-semibold">{formatCurrency(pl.income)}</p></div>
          <div><p className="text-xs text-slate-500">Broker Charges</p><p className="font-semibold">{formatCurrency(pl.brokerCharges)}</p></div>
          <div><p className="text-xs text-slate-500">Expenses</p><p className="font-semibold">{formatCurrency(pl.expenses)}</p></div>
          <div><p className="text-xs text-slate-500">Net Profit</p><p className="font-semibold text-emerald-600">{formatCurrency(pl.profit)} ({pl.marginPercent}%)</p></div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Record Payment"
            subtitle={`Outstanding: ${formatCurrency(live?.balance ?? 0)} · Received: ${formatCurrency(received)} (advance + payments)`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Amount (₹)" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} />
            <Select label="Mode" options={PAYMENT_MODES} value={paymentForm.paymentMode} onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMode: e.target.value }))} />
            <Input label="Reference" value={paymentForm.referenceNo} onChange={(e) => setPaymentForm((f) => ({ ...f, referenceNo: e.target.value }))} />
            <Input label="Remarks" value={paymentForm.remarks} onChange={(e) => setPaymentForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
          <Button className="mt-3" icon={saving ? Loader2 : Plus} disabled={saving} onClick={submitPayment}>Record Payment</Button>
          <div className="mt-4">
            <ERPDataTable columns={paymentCols} data={summary?.payments ?? []} showActions={false} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Broker Charges" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Broker Name" value={brokerForm.brokerName} onChange={(e) => setBrokerForm((f) => ({ ...f, brokerName: e.target.value }))} />
            <Select label="Type" options={CHARGE_TYPES} value={brokerForm.chargeType} onChange={(e) => setBrokerForm((f) => ({ ...f, chargeType: e.target.value }))} />
            <Input label="Amount (₹)" type="number" value={brokerForm.amount} onChange={(e) => setBrokerForm((f) => ({ ...f, amount: e.target.value }))} />
            <Input label="Remarks" value={brokerForm.remarks} onChange={(e) => setBrokerForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
          <Button className="mt-3" variant="outline" icon={Plus} disabled={saving} onClick={submitBroker}>Add Broker Charge</Button>
          <div className="mt-4 space-y-2">
            {(summary?.brokerCharges ?? []).map((c) => (
              <div key={c.id} className="flex justify-between border-b border-slate-100 py-1 text-sm dark:border-slate-800">
                <span>{c.brokerName} · {c.chargeType}</span>
                <span>{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Additional Expenses" subtitle="Add multiple expenses after booking is created" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Category" options={EXPENSE_CATS} value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} />
          <Input label="Amount (₹)" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input label="Vendor" value={expenseForm.vendorName} onChange={(e) => setExpenseForm((f) => ({ ...f, vendorName: e.target.value }))} />
          <Input label="Description" value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <Button className="mt-3" variant="outline" icon={Plus} disabled={saving} onClick={submitExpense}>Add Expense</Button>
        <div className="mt-4 space-y-2">
          {(summary?.expenses ?? []).map((e) => (
            <div key={e.id} className="flex justify-between border-b border-slate-100 py-1 text-sm dark:border-slate-800">
              <span>{e.expenseDate} · {e.category} {e.vendorName ? `· ${e.vendorName}` : ''}</span>
              <span>{formatCurrency(e.amount)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="RCM & FC Billing" subtitle="Includes freight, other charges, advance (booking + payments), and balance due" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={saving} onClick={() => createBill('RCM')}>Generate RCM Bill</Button>
          <Button variant="outline" disabled={saving} onClick={() => createBill('FC')}>Generate FC Bill</Button>
        </div>
        <div className="mt-4 space-y-2">
          {(summary?.bills ?? []).map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm dark:border-slate-800">
              <div>
                <p className="font-medium">{b.billNo} · {b.billType} · {b.billDate}</p>
                <p className="text-xs text-slate-500">
                  Taxable {formatCurrency(b.taxableAmount)}
                  {b.otherCharges > 0 ? ` · Other ${formatCurrency(b.otherCharges)}` : ''}
                  {b.advance > 0 ? ` · Advance ${formatCurrency(b.advance)}` : ''}
                  {' · Due '}{formatCurrency(b.netPayable ?? b.totalAmount)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" icon={Printer} onClick={() => print(<TransportBillPrint bill={b} company={company} booking={booking} />)}>Print</Button>
                <Button variant="ghost" size="sm" icon={Trash2} disabled={saving} onClick={() => deleteBill(b)}>Delete</Button>
              </div>
            </div>
          ))}
          {(summary?.bills ?? []).length === 0 && (
            <p className="text-sm text-slate-500">No bills generated yet.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
