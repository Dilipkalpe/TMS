import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import LookupSelect from '../../components/ui/LookupSelect'
import DriverLookupSelect from '../../components/ui/DriverLookupSelect'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import { bookingsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const bookingStatuses = ['Pending', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled']
const paymentStatuses = ['Unpaid', 'Partial', 'Paid']

export default function NewBooking() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    customer: '',
    consignor: '',
    consignee: '',
    from: '',
    to: '',
    material: '',
    quantity: '',
    vehicle: '',
    driver: '',
    freight: '',
    advance: '',
    status: 'Pending',
    payment: 'Unpaid',
    remarks: '',
  })

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.customer?.trim()) {
      toast({ title: 'Validation', message: 'Customer is required.', type: 'warning' })
      return
    }
    if (!form.from?.trim() || !form.to?.trim()) {
      toast({ title: 'Validation', message: 'From and To cities are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await bookingsApi.create({
        date: form.date,
        customer: form.customer,
        consignor: form.consignor,
        consignee: form.consignee,
        from: form.from,
        to: form.to,
        material: form.material,
        quantity: form.quantity,
        vehicle: form.vehicle,
        driver: form.driver,
        freight: Number(form.freight) || 0,
        advance: Number(form.advance) || 0,
        status: form.status,
        payment: form.payment,
        remarks: form.remarks,
      })
      toast({ title: 'Booking saved', type: 'success' })
      navigate('/bookings')
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Booking" title="Add New Record">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Booking Date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          <LookupSelect label="Customer" type="customers" value={form.customer} onChange={(v) => set('customer', v)} placeholder="Search customer…" />
          <Input label="Consignor" value={form.consignor} onChange={(e) => set('consignor', e.target.value)} placeholder="Consignor name" />
          <Input label="Consignee" value={form.consignee} onChange={(e) => set('consignee', e.target.value)} placeholder="Consignee name" />
          <Input label="From" value={form.from} onChange={(e) => set('from', e.target.value)} placeholder="Origin city" />
          <Input label="To" value={form.to} onChange={(e) => set('to', e.target.value)} placeholder="Destination city" />
          <Input label="Material" value={form.material} onChange={(e) => set('material', e.target.value)} placeholder="Material type" />
          <Input label="Quantity" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="e.g. 12 MT" />
          <LookupSelect label="Vehicle" type="vehicles" value={form.vehicle} onChange={(v) => set('vehicle', v)} placeholder="Search vehicle…" />
          <DriverLookupSelect label="Driver" value={form.driver} onChange={(v) => set('driver', v)} />
          <Input label="Freight (₹)" type="number" value={form.freight} onChange={(e) => set('freight', e.target.value)} />
          <Input label="Advance (₹)" type="number" value={form.advance} onChange={(e) => set('advance', e.target.value)} />
          <Select label="Booking Status" value={form.status} onChange={(e) => set('status', e.target.value)} options={bookingStatuses} />
          <Select label="Payment Status" value={form.payment} onChange={(e) => set('payment', e.target.value)} options={paymentStatuses} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Textarea label="Remarks" value={form.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="Additional notes..." />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Booking'}</Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/bookings')}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
