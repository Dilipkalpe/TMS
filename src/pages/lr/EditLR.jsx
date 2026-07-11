import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import LookupSelect from '../../components/ui/LookupSelect'
import DriverLookupSelect from '../../components/ui/DriverLookupSelect'
import { lrApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Save, ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { usePrint } from '../../context/PrintContext'
import LRPrintFormat from '../../components/print/LRPrintFormat'

const PAYMENT_TYPES = ['To Pay', 'Paid', 'TBB', 'To Be Billed']

function mapLrToForm(lr) {
  return {
    lrNumber: lr.lrNumber,
    lrDate: lr.lrDate,
    consignor: lr.consignor ?? '',
    consignee: lr.consignee ?? '',
    from: lr.from ?? '',
    to: lr.to ?? '',
    vehicle: lr.vehicle ?? '',
    driver: lr.driver ?? '',
    material: lr.material ?? '',
    quantity: lr.quantity ?? '',
    freight: lr.freight ?? 0,
    gst: lr.gst ?? 0,
    hamali: lr.hamali ?? 0,
    loadingCharges: lr.loadingCharges ?? 0,
    unloadingCharges: lr.unloadingCharges ?? 0,
    insurance: lr.insurance ?? 0,
    advance: lr.advance ?? 0,
    balance: lr.balance ?? 0,
    paymentType: lr.paymentType ?? 'To Pay',
    remarks: lr.remarks ?? '',
  }
}

function calcBalance(next) {
  const total = Number(next.freight) + Number(next.gst) + Number(next.hamali)
    + Number(next.loadingCharges) + Number(next.unloadingCharges) + Number(next.insurance)
  return total - Number(next.advance)
}

export default function EditLR() {
  const { lrNumber } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    lrApi.get(lrNumber)
      .then((lr) => {
        if (cancelled) return
        setForm(mapLrToForm(lr))
      })
      .catch((err) => {
        if (!cancelled) toast({ title: 'Load failed', message: err.message, type: 'error' })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [lrNumber, toast])

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      next.balance = calcBalance(next)
      return next
    })
  }

  const handleSave = async () => {
    if (!form.from?.trim() || !form.to?.trim()) {
      toast({ title: 'Validation', message: 'From and To cities are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await lrApi.update(lrNumber, form)
      toast({ title: 'LR updated', message: `${lrNumber} saved successfully.`, type: 'success' })
      navigate('/lr')
    } catch (err) {
      toast({ title: 'Update failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    print(<LRPrintFormat lr={form} company={company} />)
  }

  if (loading || !form) {
    return (
      <ERPContentPage module="LR Management" title="Edit LR">
        <p className="text-sm text-slate-500">Loading LR…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage module="LR Management" title={`Edit LR ${lrNumber}`}>
      <Card>
        <CardHeader title="LR Details" subtitle="Update lorry receipt information" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="LR Number" value={form.lrNumber} readOnly />
          <Input label="LR Date" type="date" value={form.lrDate} onChange={(e) => update('lrDate', e.target.value)} />
          <Input label="Consignor" value={form.consignor} onChange={(e) => update('consignor', e.target.value)} />
          <Input label="Consignee" value={form.consignee} onChange={(e) => update('consignee', e.target.value)} />
          <Input label="From" value={form.from} onChange={(e) => update('from', e.target.value)} />
          <Input label="To" value={form.to} onChange={(e) => update('to', e.target.value)} />
          <LookupSelect label="Vehicle" type="vehicles" value={form.vehicle} onChange={(v) => update('vehicle', v)} placeholder="Search vehicle…" />
          <DriverLookupSelect label="Driver" value={form.driver} onChange={(v) => update('driver', v)} />
          <Input label="Material" value={form.material} onChange={(e) => update('material', e.target.value)} />
          <Input label="Quantity" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
          <Input label="Freight (₹)" type="number" value={form.freight} onChange={(e) => update('freight', e.target.value)} />
          <Input label="GST (₹)" type="number" value={form.gst} onChange={(e) => update('gst', e.target.value)} />
          <Input label="Hamali (₹)" type="number" value={form.hamali} onChange={(e) => update('hamali', e.target.value)} />
          <Input label="Loading Charges (₹)" type="number" value={form.loadingCharges} onChange={(e) => update('loadingCharges', e.target.value)} />
          <Input label="Unloading Charges (₹)" type="number" value={form.unloadingCharges} onChange={(e) => update('unloadingCharges', e.target.value)} />
          <Input label="Insurance (₹)" type="number" value={form.insurance} onChange={(e) => update('insurance', e.target.value)} />
          <Input label="Advance (₹)" type="number" value={form.advance} onChange={(e) => update('advance', e.target.value)} />
          <Input label="Balance (₹)" type="number" value={form.balance} readOnly />
          <Select label="Payment Type" options={PAYMENT_TYPES} value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Textarea label="Remarks" value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Update LR'}</Button>
          <Button variant="outline" icon={Printer} onClick={handlePrint}>Print LR</Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/lr')}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
