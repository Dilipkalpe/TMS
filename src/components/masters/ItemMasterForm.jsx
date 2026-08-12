import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../ui/ERPContentPage'
import Card, { CardHeader } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select, Textarea } from '../ui/Input'
import { useToast } from '../../context/ToastContext'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import { clearControlsAfterSave } from '../../utils/formResetAfterSave'

const STATUS_OPTIONS = ['Active', 'Inactive']
const PACKAGE_TYPES = ['Box', 'Carton', 'Coil', 'Bag', 'Pallet', 'Other']

const EMPTY_ITEM = {
  name: '',
  hsn: '',
  defaultPackageType: 'Box',
  unit: 'Kg',
  remarks: '',
  status: 'Active',
}

export default function ItemMasterForm({
  title,
  listPath,
  saveLabel,
  api,
  initial = {},
  isEdit = false,
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const formRootRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    ...EMPTY_ITEM,
    ...initial,
  })

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast({ title: 'Validation', message: 'Item name is required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      if (isEdit) await api.update(initial.id, form)
      else await api.create(form)
      toast({ title: 'Saved', message: `${form.name} saved successfully.`, type: 'success' })
      if (isEdit) {
        navigate(listPath)
      } else {
        clearControlsAfterSave({
          reset: () => setForm({ ...EMPTY_ITEM }),
          formRoot: formRootRef.current,
        })
      }
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Items" title={title}>
      <Card>
        <CardHeader title={title} subtitle="Cargo / product master for LR item lines" />
        <div ref={formRootRef} data-kbd-form-root className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Item Name *" value={form.name} onChange={(e) => update('name', e.target.value)} />
          <Input label="HSN Code" value={form.hsn} onChange={(e) => update('hsn', e.target.value)} placeholder="e.g. 8708" />
          <Select
            label="Default Package Type"
            options={PACKAGE_TYPES}
            value={form.defaultPackageType}
            onChange={(e) => update('defaultPackageType', e.target.value)}
          />
          <Input label="Unit" value={form.unit} onChange={(e) => update('unit', e.target.value)} />
          <Select label="Status" options={STATUS_OPTIONS} value={form.status} onChange={(e) => update('status', e.target.value)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Textarea label="Remarks" value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
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
