import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import PartyMasterSelect from '../../components/masters/PartyMasterSelect'
import { customersApi, freightRatesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const vehicleTypes = [
  { value: '', label: 'Any' },
  { value: '32 FT Container', label: '32 FT Container' },
  { value: '20 FT Container', label: '20 FT Container' },
  { value: 'Trailer', label: 'Trailer' },
  { value: '16 FT Truck', label: '16 FT Truck' },
]

export default function NewFreightRate() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fromCity: '',
    toCity: '',
    vehicleType: '',
    customerId: '',
    customerName: '',
    rateAmount: '',
    rateUnit: 'PerTrip',
    validFrom: '',
    validTo: '',
    notes: '',
  })

  const save = async () => {
    setSaving(true)
    try {
      await freightRatesApi.create({
        fromCity: form.fromCity,
        toCity: form.toCity,
        vehicleType: form.vehicleType || null,
        customerId: form.customerId || null,
        rateAmount: Number(form.rateAmount) || 0,
        rateUnit: form.rateUnit || 'PerTrip',
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        notes: form.notes || null,
        isActive: true,
      })
      toast({ title: 'Saved', type: 'success' })
      navigate('/freight-rates')
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Freight Rates" title="Add Freight Rate">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="From City" value={form.fromCity} onChange={(e) => setForm((f) => ({ ...f, fromCity: e.target.value }))} placeholder="Mumbai" />
          <Input label="To City" value={form.toCity} onChange={(e) => setForm((f) => ({ ...f, toCity: e.target.value }))} placeholder="Delhi" />
          <Select label="Vehicle Type" options={vehicleTypes} value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))} />
          <PartyMasterSelect
            label="Customer (optional)"
            api={customersApi}
            masterKey="customers"
            valueId={form.customerId}
            displayValue={form.customerName}
            placeholder="Search customer…"
            onSelect={(row) => setForm((f) => ({
              ...f,
              customerId: row?.id ?? '',
              customerName: row?.name ?? row?.companyName ?? '',
            }))}
          />
          <Input label="Rate Amount (₹)" type="number" value={form.rateAmount} onChange={(e) => setForm((f) => ({ ...f, rateAmount: e.target.value }))} />
          <Select
            label="Rate Unit"
            options={[
              { value: 'PerTrip', label: 'Per Trip' },
              { value: 'PerTon', label: 'Per Ton' },
              { value: 'PerKm', label: 'Per Km' },
            ]}
            value={form.rateUnit}
            onChange={(e) => setForm((f) => ({ ...f, rateUnit: e.target.value }))}
          />
          <Input label="Valid From" type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} />
          <Input label="Valid To" type="date" value={form.validTo} onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="sm:col-span-2" />
        </div>
        <div className="mt-6 flex gap-2">
          <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Rate'}</Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/freight-rates')}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
