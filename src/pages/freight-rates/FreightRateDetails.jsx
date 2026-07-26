import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { freightRatesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const vehicleTypes = ['', '32 FT Container', '20 FT Container', 'Trailer', '16 FT Truck']

export default function FreightRateDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)

  useEffect(() => {
    freightRatesApi.get(id)
      .then((r) => setForm({
        fromCity: r.fromCity || '',
        toCity: r.toCity || '',
        vehicleType: r.vehicleType || '',
        customerId: r.customerId || '',
        rateAmount: r.rateAmount ?? '',
        rateUnit: r.rateUnit || 'PerTrip',
        validFrom: r.validFrom || '',
        validTo: r.validTo || '',
        isActive: r.isActive !== false,
        notes: r.notes || '',
      }))
      .catch((err) => toast({ title: 'Load failed', message: err.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [id, toast])

  const save = async () => {
    setSaving(true)
    try {
      await freightRatesApi.update(id, {
        ...form,
        rateAmount: Number(form.rateAmount) || 0,
        vehicleType: form.vehicleType || null,
        customerId: form.customerId || null,
      })
      toast({ title: 'Rate updated', type: 'success' })
      navigate('/freight-rates')
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) {
    return (
      <ERPContentPage module="Freight Rates" title="Rate Details">
        <div className="flex items-center gap-2 p-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage
      module="Freight Rates"
      title="Edit Freight Rate"
      toolbar={
        <div className="flex gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/freight-rates')}>Back</Button>
          <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      }
    >
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <Input label="From City" value={form.fromCity} onChange={(e) => setForm((f) => ({ ...f, fromCity: e.target.value }))} />
        <Input label="To City" value={form.toCity} onChange={(e) => setForm((f) => ({ ...f, toCity: e.target.value }))} />
        <Select label="Vehicle Type" value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
          options={vehicleTypes.map((v) => ({ value: v, label: v || 'Any' }))} />
        <Input label="Customer Id" value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} />
        <Input label="Rate Amount" type="number" value={form.rateAmount} onChange={(e) => setForm((f) => ({ ...f, rateAmount: e.target.value }))} />
        <Select label="Rate Unit" value={form.rateUnit} onChange={(e) => setForm((f) => ({ ...f, rateUnit: e.target.value }))}
          options={[{ value: 'PerTrip', label: 'Per Trip' }, { value: 'PerTon', label: 'Per Ton' }, { value: 'PerKm', label: 'Per Km' }]} />
        <Input label="Valid From" type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} />
        <Input label="Valid To" type="date" value={form.validTo} onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))} />
        <Select label="Active" value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}
          options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
        <div className="sm:col-span-2">
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </Card>
    </ERPContentPage>
  )
}
