import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import GpsNav from './GpsNav'
import { gpsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function VehicleHistoryPage() {
  const { vehicleId } = useParams()
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [hours, setHours] = useState(24)

  const load = useCallback(async () => {
    try {
      const to = new Date()
      const from = new Date(to.getTime() - hours * 3600 * 1000)
      const r = await gpsApi.history(vehicleId, {
        from: from.toISOString(),
        to: to.toISOString(),
      })
      setData(r)
    } catch (e) {
      toast({ title: 'History load failed', message: e.message, type: 'error' })
    }
  }, [vehicleId, hours, toast])

  useEffect(() => { load() }, [load])

  const positions = data?.points?.map((p) => [Number(p.lat), Number(p.lng)]) ?? []
  const center = positions.length > 0 ? positions[Math.floor(positions.length / 2)] : [19.076, 72.8777]

  return (
    <ERPContentPage module="Operations" title={`GPS History · ${data?.registrationNo ?? vehicleId}`}>
      <GpsNav />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/operations/gps"><Button variant="secondary">← Live map</Button></Link>
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value={6}>Last 6 hours</option>
          <option value={24}>Last 24 hours</option>
          <option value={72}>Last 3 days</option>
          <option value={168}>Last 7 days</option>
        </select>
        <Button onClick={load}>Refresh</Button>
      </div>
      {data?.summary && (
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {[
            ['Points', data.summary.pointCount],
            ['Distance km', data.summary.distanceKm],
            ['Max speed', data.summary.maxSpeedKmh ?? '—'],
            ['Avg speed', data.summary.avgSpeedKmh ?? '—'],
          ].map(([l, v]) => (
            <Card key={l} className="p-3"><p className="text-xs text-slate-500">{l}</p><p className="font-bold">{v}</p></Card>
          ))}
        </div>
      )}
      <Card className="mb-4 overflow-hidden p-0">
        <MapContainer center={center} zoom={10} className="h-[400px] w-full" scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#2563eb', weight: 4 }} />}
          {positions.length > 0 && (
            <>
              <CircleMarker center={positions[0]} radius={8} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1 }} />
              <CircleMarker center={positions[positions.length - 1]} radius={8} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }} />
            </>
          )}
        </MapContainer>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Lat</th>
              <th className="px-4 py-2 text-left">Lng</th>
              <th className="px-4 py-2 text-right">Speed</th>
            </tr>
          </thead>
          <tbody>
            {(data?.points ?? []).slice().reverse().map((p, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-2">{new Date(p.recordedAt).toLocaleString()}</td>
                <td className="px-4 py-2">{p.lat}</td>
                <td className="px-4 py-2">{p.lng}</td>
                <td className="px-4 py-2 text-right">{p.speedKmh ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </ERPContentPage>
  )
}
