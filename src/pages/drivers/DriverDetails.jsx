import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Save } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { driversApi, driverPortalApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import PrintButton from '../../components/print/PrintButton'

function formatAge(iso) {
  if (!iso) return '—'
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  return new Date(iso).toLocaleString()
}

function trackingVariant(status) {
  if (status === 'Tracking Active') return 'success'
  if (status === 'Location Stale') return 'warning'
  if (status === 'Trip Completed') return 'default'
  return 'default'
}

export default function DriverDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', status: 'Active',
    allowDriverAppAccess: false, portalPhone: '', accessPin: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const d = await driversApi.get(id)
      setDriver(d)
      setForm({
        name: d.name || '',
        phone: d.phone || '',
        email: d.email || '',
        address: d.address || '',
        status: d.status || 'Active',
        allowDriverAppAccess: !!d.portalEnabled,
        portalPhone: (d.portalPhone || d.phone || '').replace(/\D/g, '').slice(-10),
        accessPin: '',
      })
      setError('')
    } catch (e) {
      setError(e.message || 'Driver not found')
      setDriver(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const save = async () => {
    if (form.allowDriverAppAccess && !form.accessPin && !driver?.hasPin) {
      toast({ title: 'Access PIN required', message: 'Set a PIN when enabling Driver App Access', type: 'error' })
      return
    }
    setSaving(true)
    try {
      await driversApi.update(id, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        status: form.status,
        allowDriverAppAccess: form.allowDriverAppAccess,
        portalPhone: form.portalPhone || form.phone,
        portalPin: form.accessPin || undefined,
      })
      if (form.allowDriverAppAccess || driver?.portalEnabled) {
        await driverPortalApi.setDriverPortal(id, {
          enabled: form.allowDriverAppAccess,
          phone: form.portalPhone || form.phone,
          pin: form.accessPin || undefined,
        })
      }
      toast({ title: 'Saved', type: 'success' })
      setForm((f) => ({ ...f, accessPin: '' }))
      await load()
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ERPContentPage module="Drivers" title="Driver Details">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  if (error || !driver) {
    return (
      <ERPContentPage module="Drivers" title="Driver Details">
        <p className="text-sm text-red-500">{error || 'Driver not found'}</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/drivers')}>Back</Button>
      </ERPContentPage>
    )
  }

  const printFields = [
    { label: 'Driver ID', value: driver.id },
    { label: 'Driver Name', value: driver.name },
    { label: 'Mobile Number', value: driver.phone },
    { label: 'Driver App Access', value: driver.driverAppStatus || (driver.portalEnabled ? 'Enabled' : 'Disabled') },
    { label: 'Current Vehicle', value: driver.currentVehicleNumber },
    { label: 'Current Location', value: driver.currentLocation },
    { label: 'Tracking', value: driver.trackingStatus },
  ]

  return (
    <ERPContentPage
      module="Drivers"
      title={driver.name}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/drivers')}>Back</Button>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(driver.status)}>{driver.status}</Badge>
            <Badge variant={driver.portalEnabled ? 'success' : 'default'}>
              App: {driver.driverAppStatus || (driver.portalEnabled ? 'Enabled' : 'Disabled')}
            </Badge>
            <PrintButton title="Driver Profile" subtitle={driver.name} fields={printFields} />
            <Button icon={Save} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Driver Master" />
          <div className="space-y-3 p-1">
            <div>
              <p className="text-xs text-slate-500">Driver ID</p>
              <p className="font-medium">{driver.id}</p>
            </div>
            <Input label="Driver Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Mobile Number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Status</span>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option>Active</option>
                <option>On Leave</option>
              </select>
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Allow Driver App Access" />
          <div className="space-y-3 p-1">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={form.allowDriverAppAccess}
                onChange={(e) => setForm((f) => ({ ...f, allowDriverAppAccess: e.target.checked }))}
              />
              <div>
                <p className="font-medium">Allow Driver App Access</p>
                <p className="text-xs text-slate-500">Optional. Default OFF. When OFF, driver cannot use the Driver Web Portal.</p>
              </div>
            </label>
            <p className="text-sm">
              Driver Portal Access:{' '}
              <strong>{form.allowDriverAppAccess ? 'Enabled' : 'Disabled'}</strong>
              {driver.hasPin ? ' · PIN set' : ' · No PIN'}
            </p>
            {form.allowDriverAppAccess && (
              <>
                <Input
                  label="Portal mobile (login)"
                  value={form.portalPhone}
                  onChange={(e) => setForm((f) => ({ ...f, portalPhone: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                  placeholder="10-digit mobile"
                />
                <Input
                  label="Driver App Access PIN"
                  type="password"
                  autoComplete="new-password"
                  value={form.accessPin}
                  onChange={(e) => setForm((f) => ({ ...f, accessPin: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  placeholder={driver.hasPin ? '•••••• (leave blank to keep)' : 'Set 6-digit PIN'}
                />
                <p className="text-xs text-slate-500">PIN is stored securely and never shown after save.</p>
              </>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Current Location & Assignment" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-1">
            {[
              { label: 'Current Vehicle', value: driver.currentVehicleNumber || '—' },
              { label: 'Current Trip', value: driver.currentTripNo || '—' },
              { label: 'Loading Slip', value: driver.currentLoadingSlipNumber || '—' },
              { label: 'Tracking Status', value: driver.trackingStatus || 'Not Started' },
              { label: 'Current Location', value: driver.currentLocation || '—' },
              { label: 'Latitude', value: driver.latitude != null ? Number(driver.latitude).toFixed(6) : '—' },
              { label: 'Longitude', value: driver.longitude != null ? Number(driver.longitude).toFixed(6) : '—' },
              { label: 'Last Location Update', value: formatAge(driver.locationUpdatedAt) },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-slate-500">{f.label}</p>
                <p className="font-medium">{f.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 px-1 pb-1">
            <Badge variant={trackingVariant(driver.trackingStatus)}>{driver.trackingStatus || 'Not Started'}</Badge>
            {driver.currentVehicleId && (
              <>
                <Link to={`/vehicles/${driver.currentVehicleId}`} className="text-sm text-primary hover:underline">
                  Open vehicle
                </Link>
                <Link to={`/operations/gps/vehicles/${driver.currentVehicleId}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <MapPin className="h-4 w-4" /> Map & history
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>
    </ERPContentPage>
  )
}
