import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import LookupSelect from '../../components/ui/LookupSelect'
import { bookingsApi, bookingFinanceApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { Save, Loader2 } from 'lucide-react'

const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'Cheque', 'RTGS']

export default function BookingPaymentAdjustment() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [bookingId, setBookingId] = useState('')
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ amount: '', paymentMode: 'Cash', referenceNo: '', remarks: '' })

  const loadBooking = async (id) => {
    if (!id?.trim()) return
    setLoading(true)
    try {
      const b = await bookingsApi.get(id.trim())
      setBooking(b)
      setBookingId(id.trim())
    } catch (err) {
      setBooking(null)
      toast({ title: 'Not found', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!booking) return
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      toast({ title: 'Validation', message: 'Enter payment amount.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const res = await bookingFinanceApi.recordPayment(booking.id, { ...form, amount })
      toast({ title: 'Payment recorded', message: `Outstanding: ${formatCurrency(res.outstanding)}`, type: 'success' })
      setBooking((b) => ({ ...b, balance: res.outstanding, payment: res.paymentStatus }))
      setForm({ amount: '', paymentMode: 'Cash', referenceNo: '', remarks: '' })
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Accounting" title="Outstanding Payment Adjustment">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Record customer payment against a booking. <strong>Outstanding = Freight − Advance − all payments.</strong> Same action as Record Payment on the booking details page.
      </p>
      <Card>
        <CardHeader title="Select Booking" subtitle="Enter booking number and click Load Booking" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Booking Number" value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="e.g. BK-1044" />
          <div className="flex items-end">
            <Button variant="outline" onClick={() => loadBooking(bookingId)} disabled={loading}>{loading ? 'Loading…' : 'Load Booking'}</Button>
          </div>
        </div>
      </Card>

      {booking && (
        <Card className="mt-4">
          <CardHeader title={`Booking ${booking.id}`} subtitle={`${booking.customer} · ${booking.from} → ${booking.to}`} />
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <div><p className="text-xs text-slate-500">Freight</p><p className="font-semibold">{formatCurrency(booking.freight)}</p></div>
            <div><p className="text-xs text-slate-500">Advance</p><p className="font-semibold">{formatCurrency(booking.advance)}</p></div>
            <div><p className="text-xs text-slate-500">Outstanding</p><p className="font-semibold text-amber-600">{formatCurrency(booking.balance)}</p></div>
            <div><p className="text-xs text-slate-500">Status</p><p className="font-semibold">{booking.payment}</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Payment Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            <Select label="Mode" options={PAYMENT_MODES} value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))} />
            <Input label="Reference" value={form.referenceNo} onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))} />
            <Input label="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Record Payment'}</Button>
            <Button variant="outline" onClick={() => navigate(`/bookings/${booking.id}`)}>View Booking</Button>
          </div>
        </Card>
      )}
    </ERPContentPage>
  )
}
