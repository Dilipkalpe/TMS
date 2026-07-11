import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import { vehiclesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { normalizeDateForApi } from '../../utils/dates'

const VEHICLE_TYPES = ['32 FT Container', '20 FT Container', 'Trailer', '16 FT Truck']
const OWNERS = ['Self', 'Hired']
const STATUSES = ['Active', 'Maintenance']

export default function EditVehicle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)

  useEffect(() => {
    let cancelled = false
    vehiclesApi.get(id)
      .then((v) => {
        if (cancelled) return
        setForm({
          number: v.number ?? '',
          type: v.type ?? VEHICLE_TYPES[0],
          model: v.model ?? '',
          capacity: v.capacity ?? '',
          owner: v.owner ?? 'Self',
          status: v.status ?? 'Active',
          insurance: v.insurance ?? '',
          fitness: v.fitness ?? '',
          permit: v.permit ?? '',
          puc: v.puc ?? '',
        })
      })
      .catch((err) => {
        if (!cancelled) toast({ title: 'Load failed', message: err.message, type: 'error' })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, toast])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.number?.trim()) {
      toast({ title: 'Validation', message: 'Vehicle number is required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await vehiclesApi.update(id, {
        number: form.number.trim(),
        type: form.type,
        model: form.model,
        capacity: form.capacity,
        owner: form.owner,
        status: form.status,
        insurance: normalizeDateForApi(form.insurance),
        fitness: normalizeDateForApi(form.fitness),
        permit: normalizeDateForApi(form.permit),
        puc: normalizeDateForApi(form.puc),
      })
      toast({ title: 'Vehicle updated', type: 'success' })
      navigate(`/vehicles/${id}`)
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) {
    return (
      <ERPContentPage module="Vehicles" title="Edit Vehicle">
        <p className="text-sm text-slate-500">Loading vehicle…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage module="Vehicles" title={`Edit Vehicle — ${form.number}`}>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Vehicle Number" value={form.number} onChange={(e) => set('number', e.target.value)} />
          <Select label="Type" value={form.type} onChange={(e) => set('type', e.target.value)} options={VEHICLE_TYPES} />
          <Input label="Model" value={form.model} onChange={(e) => set('model', e.target.value)} />
          <Input label="Capacity" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
          <Select label="Owner" value={form.owner} onChange={(e) => set('owner', e.target.value)} options={OWNERS} />
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)} options={STATUSES} />
          <Input label="Insurance Expiry" type="date" value={form.insurance} onChange={(e) => set('insurance', e.target.value)} />
          <Input label="Fitness Expiry" type="date" value={form.fitness} onChange={(e) => set('fitness', e.target.value)} />
          <Input label="Permit Expiry" type="date" value={form.permit} onChange={(e) => set('permit', e.target.value)} />
          <Input label="PUC Expiry" type="date" value={form.puc} onChange={(e) => set('puc', e.target.value)} />
        </div>
        <div className="mt-6 flex gap-2">
          <Button icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(`/vehicles/${id}`)}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
