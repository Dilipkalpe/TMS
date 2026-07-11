import { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import GpsNav from './GpsNav'
import { geofenceApi, vehiclesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'

const emptyForm = {
  name: '', description: '', centerLat: '19.076', centerLng: '72.8777',
  radiusMeters: '500', alertOnEnter: false, alertOnExit: true, appliesToAll: true,
}

export default function GeofenceManagerPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [selectedIds, setSelectedIds] = useState([])

  const load = useCallback(async () => {
    try {
      const [g, v] = await Promise.all([geofenceApi.list(), vehiclesApi.list({ pageSize: 200 })])
      setRows(g.filter((x) => x.isActive))
      setVehicles(v.items ?? v ?? [])
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const submit = async (ev) => {
    ev.preventDefault()
    try {
      await geofenceApi.create({
        name: form.name,
        description: form.description || undefined,
        shapeType: 'CIRCLE',
        centerLat: Number(form.centerLat),
        centerLng: Number(form.centerLng),
        radiusMeters: Number(form.radiusMeters),
        alertOnEnter: form.alertOnEnter,
        alertOnExit: form.alertOnExit,
        appliesToAll: form.appliesToAll,
        vehicleIds: form.appliesToAll ? [] : selectedIds,
      })
      toast({ title: 'Geofence created', type: 'success' })
      setForm(emptyForm)
      setSelectedIds([])
      load()
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    }
  }

  const deactivate = async (id) => {
    try {
      await geofenceApi.remove(id)
      toast({ title: 'Geofence deactivated', type: 'success' })
      load()
    } catch (e) {
      toast({ title: 'Failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Geofence Manager">
      <GpsNav />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <p className="mb-3 font-semibold">Create circle geofence</p>
          <form onSubmit={submit} className="space-y-3">
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" step="any" placeholder="Center lat" value={form.centerLat} onChange={(e) => setForm({ ...form, centerLat: e.target.value })} className={inputClass} />
              <input required type="number" step="any" placeholder="Center lng" value={form.centerLng} onChange={(e) => setForm({ ...form, centerLng: e.target.value })} className={inputClass} />
            </div>
            <input required type="number" placeholder="Radius (meters)" value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })} className={inputClass} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.alertOnEnter} onChange={(e) => setForm({ ...form, alertOnEnter: e.target.checked })} /> Alert on enter</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.alertOnExit} onChange={(e) => setForm({ ...form, alertOnExit: e.target.checked })} /> Alert on exit</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.appliesToAll} onChange={(e) => setForm({ ...form, appliesToAll: e.target.checked })} /> All vehicles</label>
            {!form.appliesToAll && (
              <select multiple value={selectedIds} onChange={(e) => setSelectedIds([...e.target.selectedOptions].map((o) => o.value))} className={`${inputClass} min-h-[100px]`}>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.number}</option>)}
              </select>
            )}
            <Button type="submit" className="w-full">Save geofence</Button>
          </form>
        </Card>
        <Card className="overflow-hidden p-0">
          <MapContainer center={[19.076, 72.8777]} zoom={5} className="h-[420px] w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {rows.filter((g) => g.shapeType === 'CIRCLE').map((g) => (
              <Circle key={g.id} center={[Number(g.centerLat), Number(g.centerLng)]} radius={g.radiusMeters ?? 500} pathOptions={{ color: g.color || '#3B82F6', fillOpacity: 0.15 }} />
            ))}
            {form.centerLat && form.centerLng && (
              <Circle center={[Number(form.centerLat), Number(form.centerLng)]} radius={Number(form.radiusMeters) || 500} pathOptions={{ color: '#ef4444', dashArray: '6', fillOpacity: 0.1 }} />
            )}
          </MapContainer>
        </Card>
      </div>
      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Radius</th>
              <th className="px-4 py-2 text-left">Alerts</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-4 py-2 font-medium">{g.name}</td>
                <td className="px-4 py-2">{g.shapeType}</td>
                <td className="px-4 py-2">{g.radiusMeters ? `${g.radiusMeters} m` : '—'}</td>
                <td className="px-4 py-2">{g.alertOnEnter ? 'Enter ' : ''}{g.alertOnExit ? 'Exit' : ''}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => deactivate(g.id)} className="text-red-600 hover:underline">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </ERPContentPage>
  )
}
