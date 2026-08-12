import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import { useToast } from '../../context/ToastContext'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import { clearControlsAfterSave } from '../../utils/formResetAfterSave'

const STATUS_OPTIONS = ['Active', 'Inactive']

const EMPTY_PARTY = {
  name: '',
  companyName: '',
  contact: '',
  phone: '',
  email: '',
  gst: '',
  pan: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  defaultFromLocation: '',
  defaultToLocation: '',
  status: 'Active',
}

export default function PartyMasterForm({
  module,
  title,
  listPath,
  saveLabel,
  api,
  kind,
  initial = {},
  isEdit = false,
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const formRootRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    ...EMPTY_PARTY,
    ...initial,
  })

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast({ title: 'Validation', message: 'Name is required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (isEdit) await api.update(initial.id, payload)
      else await api.create(payload)
      toast({ title: 'Saved', message: `${form.name} saved successfully.`, type: 'success' })
      if (isEdit) {
        navigate(listPath)
      } else {
        clearControlsAfterSave({
          reset: () => setForm({ ...EMPTY_PARTY }),
          formRoot: formRootRef.current,
        })
      }
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const locationField = kind === 'consignor'
    ? { key: 'defaultFromLocation', label: 'Default From Location' }
    : { key: 'defaultToLocation', label: 'Default To Location' }

  return (
    <ERPContentPage module={module} title={title}>
      <Card>
        <CardHeader title={title} subtitle="Master record details" />
        <div ref={formRootRef} data-kbd-form-root className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label={kind === 'consignor' ? 'Consignor Name' : 'Consignee Name'} value={form.name} onChange={(e) => update('name', e.target.value)} />
          <Input label="Company Name" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
          <Input label="Contact Person" value={form.contact} onChange={(e) => update('contact', e.target.value)} />
          <Input label="Mobile Number" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          <Input label="Email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          <Input label="GST Number" value={form.gst} onChange={(e) => update('gst', e.target.value)} />
          <Input label="PAN Number" value={form.pan} onChange={(e) => update('pan', e.target.value)} />
          <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} />
          <Input label="State" value={form.state} onChange={(e) => update('state', e.target.value)} />
          <Input label="Pincode" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} />
          <Input label={locationField.label} value={form[locationField.key]} onChange={(e) => update(locationField.key, e.target.value)} />
          <Select label="Status" options={STATUS_OPTIONS} value={form.status} onChange={(e) => update('status', e.target.value)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : saveLabel}</Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(listPath)}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
