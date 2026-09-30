import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import PartyMasterSelect from '../../components/masters/PartyMasterSelect'
import { customersApi, quotationsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const vehicleTypes = [
  { value: '', label: 'Any' },
  { value: '32 FT Container', label: '32 FT Container' },
  { value: '20 FT Container', label: '20 FT Container' },
  { value: 'Trailer', label: 'Trailer' },
  { value: '16 FT Truck', label: '16 FT Truck' },
]

export default function NewQuotation() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    fromCity: '',
    toCity: '',
    vehicleType: '',
    freight: '',
    validUntil: '',
    notes: '',
  })

  const save = async () => {
    if (!form.customerName?.trim()) {
      toast({ title: 'Validation', message: 'Select a customer.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await quotationsApi.create({
        customerName: form.customerName,
        customerId: form.customerId || null,
        fromCity: form.fromCity,
        toCity: form.toCity,
        vehicleType: form.vehicleType || null,
        freight: Number(form.freight) || 0,
        validUntil: form.validUntil || null,
        notes: form.notes || null,
      })
      toast({ title: 'Saved', type: 'success' })
      navigate('/quotations')
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Quotations" title="New Quotation">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PartyMasterSelect
            label="Customer *"
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
          <Input label="From City" value={form.fromCity} onChange={(e) => setForm((f) => ({ ...f, fromCity: e.target.value }))} placeholder="Mumbai" />
          <Input label="To City" value={form.toCity} onChange={(e) => setForm((f) => ({ ...f, toCity: e.target.value }))} placeholder="Delhi" />
          <Select label="Vehicle Type" options={vehicleTypes} value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))} />
          <Input label="Freight (₹)" type="number" value={form.freight} onChange={(e) => setForm((f) => ({ ...f, freight: e.target.value }))} />
          <Input label="Valid Until" type="date" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="sm:col-span-2" />
        </div>
        <div className="mt-6 flex gap-2">
          <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Quotation'}</Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/quotations')}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
