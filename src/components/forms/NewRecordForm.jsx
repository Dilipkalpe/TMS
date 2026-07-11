import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../ui/ERPContentPage'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export default function NewRecordForm({
  module,
  title,
  fields,
  listPath,
  saveLabel,
  onSubmit,
  initialValues = {},
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [form, setForm] = useState(() =>
    fields.reduce((acc, f) => {
      const key = f.name || f.label.toLowerCase().replace(/\s+/g, '')
      acc[key] = initialValues[key] ?? f.defaultValue ?? ''
      return acc
    }, {}),
  )
  const [saving, setSaving] = useState(false)

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const handleSave = async () => {
    if (!onSubmit) {
      toast({ title: 'Not configured', message: 'Save handler not connected.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await onSubmit(form)
      toast({ title: 'Saved', message: `${saveLabel} created successfully.`, type: 'success' })
      navigate(listPath)
    } catch (err) {
      toast({ title: 'Save failed', message: err.message || 'Could not save record.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module={module} title={title}>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => {
            const key = field.name || field.label.toLowerCase().replace(/\s+/g, '')
            return field.type === 'select' ? (
              <Select
                key={key}
                label={field.label}
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
                options={field.options}
              />
            ) : (
              <Input
                key={key}
                label={field.label}
                type={field.type || 'text'}
                placeholder={field.placeholder}
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
              />
            )
          })}
        </div>
        <div className="mt-6 flex gap-2">
          <Button icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saveLabel}
          </Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(listPath)}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
