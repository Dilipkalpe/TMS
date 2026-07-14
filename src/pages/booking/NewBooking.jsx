import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import LookupSelect from '../../components/ui/LookupSelect'
import DriverLookupSelect from '../../components/ui/DriverLookupSelect'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import { bookingsApi, lrApi, unwrapList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useDocumentFlow } from '../../hooks/useDocumentFlow'

const bookingStatuses = ['Pending', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled']
const paymentStatuses = ['Unpaid', 'Partial', 'Paid']

export default function NewBooking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { isFirstLrThenBooking, documentFlowLabel, loading: flowLoading } = useDocumentFlow()
  const [saving, setSaving] = useState(false)
  const [unlinkedLrs, setUnlinkedLrs] = useState([])
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
    lrNumber: searchParams.get('lrNumber') || '',
  })

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  useEffect(() => {
    if (!isFirstLrThenBooking) return
    lrApi.list({ page: 1, pageSize: 100 })
      .then((res) => {
        const rows = unwrapList(res).filter((r) => !r.bookingId)
        setUnlinkedLrs(rows)
      })
      .catch(() => setUnlinkedLrs([]))
  }, [isFirstLrThenBooking])

  const lrOptions = useMemo(
    () => [
      { value: '', label: 'Select LR…' },
      ...unlinkedLrs.map((r) => ({
        value: r.lrNumber,
        label: `${r.lrNumber} · ${r.from || ''} → ${r.to || ''}`,
      })),
    ],
    [unlinkedLrs],
  )

  const applyLr = async (lrNumber) => {
    set('lrNumber', lrNumber)
    if (!lrNumber) return
    try {
      const lr = await lrApi.get(lrNumber)
      setForm((f) => ({
        ...f,
        lrNumber,
        consignor: lr.consignor || f.consignor,
        consignee: lr.consignee || f.consignee,
        from: lr.from || f.from,
        to: lr.to || f.to,
        vehicle: lr.vehicle || f.vehicle,
        driver: lr.driver || f.driver,
        material: lr.material || f.material,
        quantity: lr.quantity || f.quantity,
        freight: lr.freight ?? f.freight,
        advance: lr.advance ?? f.advance,
      }))
    } catch {
      /* keep manual entry */
    }
  }

  const handleSave = async () => {
    if (isFirstLrThenBooking && !form.lrNumber?.trim()) {
      toast({
        title: 'Validation',
        message: `Company Document Flow is "${documentFlowLabel}". Create an LR first, then select it here.`,
        type: 'warning',
      })
      return
    }
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
        lrNumber: form.lrNumber || undefined,
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
      {isFirstLrThenBooking && !flowLoading && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Document Flow: <strong>{documentFlowLabel}</strong>. Select an existing LR before saving this booking.
        </div>
      )}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isFirstLrThenBooking && (
            <Select
              label="Linked LR (required)"
              value={form.lrNumber}
              onChange={(e) => applyLr(e.target.value)}
              options={lrOptions}
            />
          )}
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
