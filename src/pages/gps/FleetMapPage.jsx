import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import GpsNav from './GpsNav'
import { geofenceApi, gpsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const DEFAULT_CENTER = [19.076, 72.8777]
const DEFAULT_ZOOM = 6
const POLL_MS = Number(import.meta.env.VITE_GPS_POLL_INTERVAL_MS) || 15000

const statusColor = {
  'On Trip': '#22c55e',
  Active: '#3b82f6',
  Maintenance: '#f97316',
}

function formatAge(iso) {
  if (!iso) return ''
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (sec < 60) return `${sec} seconds ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.round(min / 60)
  return `${hr} hour${hr === 1 ? '' : 's'} ago`
}

function TrackingBadge({ position, trackingStatus }) {
  const stale = position?.isStale || trackingStatus === 'STALE'
  const live = !stale && position && (trackingStatus === 'ACTIVE' || !trackingStatus)
  if (!position) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">No GPS</span>
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${live ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
      {live ? 'LIVE' : 'STALE'}
    </span>
  )
}

function FlyTo({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) map.flyTo([lat, lng], 14, { duration: 0.8 })
  }, [lat, lng, map])
  return null
}

export default function FleetMapPage() {
  const { toast } = useToast()
  const [fleet, setFleet] = useState([])
  const [geofences, setGeofences] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [live, geo, sum] = await Promise.all([
        gpsApi.live(),
        geofenceApi.list(),
        gpsApi.fleetSummary(),
      ])
      setFleet(live)
      setGeofences(geo.filter((g) => g.isActive))
      setSummary(sum)
    } catch (e) {
      toast({ title: 'GPS load failed', message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  const selected = fleet.find((v) => v.vehicleId === selectedId)
  const fly = selected?.lastPosition

  const withPosition = useMemo(() => fleet.filter((v) => v.lastPosition), [fleet])

  return (
    <ERPContentPage module="Operations" title="Live Vehicle Tracking">
      <GpsNav />
      {summary && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Active fleet', summary.totalActive],
            ['On trip', summary.onTrip],
            ['Live GPS', summary.withRecentGps],
            ['Stale GPS', summary.staleGps],
            ['Unack alerts', summary.unackGeofenceEvents],
          ].map(([l, v]) => (
            <Card key={l} className="p-3"><p className="text-xs text-slate-500">{l}</p><p className="text-lg font-bold">{v}</p></Card>
          ))}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="overflow-hidden p-0">
          {loading ? (
            <p className="p-8 text-sm text-slate-500">Loading map…</p>
          ) : (
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-[480px] w-full" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {fly && <FlyTo lat={Number(fly.lat)} lng={Number(fly.lng)} />}
              {geofences.map((g) =>
                g.shapeType === 'CIRCLE' && g.centerLat != null ? (
                  <Circle
                    key={g.id}
                    center={[Number(g.centerLat), Number(g.centerLng)]}
                    radius={g.radiusMeters ?? 500}
                    pathOptions={{ color: g.color || '#3B82F6', fillOpacity: 0.12 }}
                  />
                ) : null,
              )}
              {withPosition.map((v) => {
                const p = v.lastPosition
                const color = p.isStale ? '#94a3b8' : (statusColor[v.status] ?? '#64748b')
                return (
                  <CircleMarker
                    key={v.vehicleId}
                    center={[Number(p.lat), Number(p.lng)]}
                    radius={selectedId === v.vehicleId ? 12 : 8}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
                    eventHandlers={{ click: () => setSelectedId(v.vehicleId) }}
                  >
                    <Popup>
                      <strong>{v.registrationNo}</strong><br />
                      {v.driverName ? `${v.driverName} · ` : ''}
                      {v.loadingSlipNumber ? `LS ${v.loadingSlipNumber} · ` : ''}
                      {p.speedKmh ?? '—'} km/h<br />
                      {p.isStale ? 'STALE' : 'LIVE'} · {formatAge(p.recordedAt)}
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          )}
        </Card>
        <Card className="max-h-[480px] overflow-y-auto p-3">
          <p className="mb-2 text-sm font-semibold">Vehicles ({fleet.length})</p>
          <ul className="space-y-2">
            {fleet.map((v) => (
              <li key={v.vehicleId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(v.vehicleId)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selectedId === v.vehicleId ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{v.registrationNo}</p>
                    <TrackingBadge position={v.lastPosition} trackingStatus={v.trackingStatus} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {v.driverName || '—'}
                    {v.loadingSlipNumber ? ` · ${v.loadingSlipNumber}` : ''}
                    {v.lastPosition ? ` · ${formatAge(v.lastPosition.recordedAt)}` : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {selected && (
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{selected.registrationNo}</p>
                <TrackingBadge position={selected.lastPosition} trackingStatus={selected.trackingStatus} />
              </div>
              <p className="text-sm text-slate-500">
                Driver: {selected.driverName || '—'}
                {selected.tripNo ? ` · Trip: ${selected.tripNo}` : ''}
                {selected.loadingSlipNumber ? ` · LS: ${selected.loadingSlipNumber}` : ''}
                {selected.tripStatus ? ` · ${selected.tripStatus}` : ''}
              </p>
              <p className="text-sm text-slate-500">
                {selected.lastPosition
                  ? `Current: ${Number(selected.lastPosition.lat).toFixed(5)}, ${Number(selected.lastPosition.lng).toFixed(5)} · ${selected.lastPosition.speedKmh ?? '—'} km/h · Last GPS: ${formatAge(selected.lastPosition.recordedAt)}`
                  : 'No GPS fix'}
                {selected.lastPosition?.source ? ` · Source: ${selected.lastPosition.source}` : ''}
              </p>
              {selected.insideGeofences?.length > 0 && (
                <p className="text-sm text-emerald-700">Inside: {selected.insideGeofences.map((g) => g.name).join(', ')}</p>
              )}
            </div>
            <Link to={`/operations/gps/vehicles/${selected.vehicleId}`}>
              <Button variant="secondary">View history</Button>
            </Link>
          </div>
        </Card>
      )}
    </ERPContentPage>
  )
}
