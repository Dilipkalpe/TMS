import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { routingApi, tripsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const DEFAULT_CENTER = [19.076, 72.8777]

function FitRoute({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points?.length) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 10)
      return
    }
    map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [48, 48] })
  }, [points, map])
  return null
}

function parsePolyline(raw) {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((p) => p.lat != null && p.lng != null) : []
  } catch {
    return []
  }
}

function fmtKm(km) {
  return km != null ? `${Number(km).toFixed(1)} km` : '—'
}

function fmtMin(m) {
  if (m == null) return '—'
  const h = Math.floor(m / 60)
  const r = m % 60
  return h > 0 ? `${h}h ${r}m` : `${r} min`
}

function fmtCurrency(n) {
  return n != null ? `₹${Math.round(Number(n)).toLocaleString('en-IN')}` : '—'
}

export default function RouteOptimizerPage() {
  const { toast } = useToast()
  const [trips, setTrips] = useState([])
  const [jobs, setJobs] = useState([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [tripDetail, setTripDetail] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [mode, setMode] = useState('trip')
  const [options, setOptions] = useState({
    trafficAware: true,
    tollOptimized: true,
    fuelOptimized: true,
    avoidTolls: false,
  })
  const [adHoc, setAdHoc] = useState({
    origin: 'Mumbai',
    destination: 'Pune',
    stops: [{ address: 'Nashik' }, { address: 'Ahmedabad' }],
  })

  const loadTrips = useCallback(async () => {
    const [t, j] = await Promise.all([tripsApi.list(), routingApi.jobs(20)])
    setTrips(t)
    setJobs(j)
    if (!selectedTripId && t.length) setSelectedTripId(t[0].id)
  }, [selectedTripId])

  useEffect(() => {
    loadTrips()
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [loadTrips, toast])

  useEffect(() => {
    if (mode !== 'trip' || !selectedTripId) {
      setTripDetail(null)
      return
    }
    routingApi.tripDetail(selectedTripId)
      .then(setTripDetail)
      .catch((e) => toast({ title: 'Trip load failed', message: e.message, type: 'error' }))
  }, [mode, selectedTripId, toast])

  const mapPoints = useMemo(() => {
    if (result?.routePolyline) return parsePolyline(result.routePolyline)
    if (result?.optimizedWaypoints?.length) {
      return result.optimizedWaypoints.map((w) => ({ lat: w.lat, lng: w.lng, label: w.label }))
    }
    return []
  }, [result])

  const polylineCoords = useMemo(
    () => mapPoints.map((p) => [p.lat, p.lng]),
    [mapPoints],
  )

  async function runOptimize() {
    setOptimizing(true)
    setResult(null)
    try {
      let res
      if (mode === 'trip') {
        if (!selectedTripId) throw new Error('Select a trip')
        res = await routingApi.optimizeTrip(selectedTripId, options)
      } else {
        res = await routingApi.optimizeAdHoc({
          origin: adHoc.origin,
          destination: adHoc.destination,
          stops: adHoc.stops.filter((s) => s.address?.trim()),
          ...options,
        })
      }
      setResult(res)
      toast({ title: 'Route optimized', message: res.notes || `${res.provider} — ${res.savingsPct}% savings`, type: 'success' })
      const j = await routingApi.jobs(20)
      setJobs(j)
    } catch (e) {
      toast({ title: 'Optimization failed', message: e.message, type: 'error' })
    } finally {
      setOptimizing(false)
    }
  }

  async function applyResult() {
    if (!result?.jobId) return
    setApplying(true)
    try {
      await routingApi.applyJob(result.jobId)
      toast({ title: 'Applied to trip', message: 'Stop order and metrics updated', type: 'success' })
      if (selectedTripId) {
        const detail = await routingApi.tripDetail(selectedTripId)
        setTripDetail(detail)
      }
      await loadTrips()
    } catch (e) {
      toast({ title: 'Apply failed', message: e.message, type: 'error' })
    } finally {
      setApplying(false)
    }
  }

  const selectedTrip = trips.find((t) => t.id === selectedTripId)

  return (
    <ERPContentPage module="Operations" title="AI Route Optimizer">
      <p className="mb-4 text-sm text-slate-500">
        Re-sequence delivery stops with nearest-neighbor + 2-opt TSP, traffic-adjusted ETA, toll & fuel estimates.
        {' '}
        <Link to="/operations/trips" className="text-primary hover:underline">Trips</Link>
        {' · '}
        <Link to="/operations/gps" className="text-primary hover:underline">GPS</Link>
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={mode === 'trip' ? 'primary' : 'secondary'} onClick={() => setMode('trip')}>Optimize trip</Button>
        <Button variant={mode === 'adHoc' ? 'primary' : 'secondary'} onClick={() => setMode('adHoc')}>Ad-hoc route</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-4">
            <h3 className="mb-3 font-semibold">Options</h3>
            <div className="space-y-2 text-sm">
              {[
                ['trafficAware', 'Traffic-aware ETA'],
                ['tollOptimized', 'Include toll estimate'],
                ['fuelOptimized', 'Fuel-efficient estimate'],
                ['avoidTolls', 'Avoid toll roads'],
              ].map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </Card>

          {mode === 'trip' ? (
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">Select trip</h3>
              {loading ? (
                <p className="text-sm text-slate-500">Loading trips…</p>
              ) : (
                <>
                  <select
                    className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                  >
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tripCode} — {t.origin} → {t.destination}
                      </option>
                    ))}
                  </select>
                  {selectedTrip && (
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <p>Stops: {(selectedTrip.stops ?? []).length}</p>
                      {(selectedTrip.stops ?? []).map((s) => (
                        <p key={s.id} className="pl-2 text-xs">
                          {s.sequenceNo}. {s.address}
                        </p>
                      ))}
                      {tripDetail?.trip?.aiOptimized && (
                        <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          AI optimized · {tripDetail.trip.optimizationSavingsPct}% savings · ETA {fmtMin(tripDetail.trip.etaMinutes)}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>
          ) : (
            <Card className="space-y-3 p-4">
              <h3 className="font-semibold">Ad-hoc route</h3>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="Origin city"
                value={adHoc.origin}
                onChange={(e) => setAdHoc((a) => ({ ...a, origin: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="Destination city"
                value={adHoc.destination}
                onChange={(e) => setAdHoc((a) => ({ ...a, destination: e.target.value }))}
              />
              <p className="text-xs text-slate-500">Intermediate stops (city names)</p>
              {adHoc.stops.map((s, i) => (
                <input
                  key={i}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder={`Stop ${i + 1}`}
                  value={s.address}
                  onChange={(e) => setAdHoc((a) => ({
                    ...a,
                    stops: a.stops.map((x, j) => (j === i ? { address: e.target.value } : x)),
                  }))}
                />
              ))}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setAdHoc((a) => ({ ...a, stops: [...a.stops, { address: '' }] }))}
              >
                + Add stop
              </Button>
            </Card>
          )}

          <Button className="w-full" onClick={runOptimize} disabled={optimizing}>
            {optimizing ? 'Optimizing…' : 'Run optimization'}
          </Button>

          {result && (
            <Card className="space-y-2 p-4 text-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Results</h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{result.provider}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-xs text-slate-500">Distance</p><p>{fmtKm(result.originalDistanceKm)} → {fmtKm(result.optimizedDistanceKm)}</p></div>
                <div><p className="text-xs text-slate-500">ETA</p><p>{fmtMin(result.originalEtaMinutes)} → {fmtMin(result.optimizedEtaMinutes)}</p></div>
                <div><p className="text-xs text-slate-500">Fuel</p><p>{result.fuelLiters} L · {fmtCurrency(result.fuelCost)}</p></div>
                <div><p className="text-xs text-slate-500">Toll</p><p>{fmtCurrency(result.tollCost)}</p></div>
              </div>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">{result.savingsPct}% distance savings</p>
              {result.notes && <p className="text-xs text-slate-500">{result.notes}</p>}
              {mode === 'trip' && result.jobId && (
                <Button className="w-full" variant="secondary" onClick={applyResult} disabled={applying}>
                  {applying ? 'Applying…' : 'Apply to trip'}
                </Button>
              )}
              {result.optimizedWaypoints?.length > 0 && (
                <div className="border-t pt-2">
                  <p className="mb-1 text-xs font-medium text-slate-500">Optimized order</p>
                  {result.optimizedWaypoints.map((w, i) => (
                    <p key={i} className="text-xs">{i + 1}. {w.label}</p>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="h-[420px] w-full">
              <MapContainer center={DEFAULT_CENTER} zoom={6} className="h-full w-full">
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitRoute points={mapPoints} />
                {polylineCoords.length > 1 && (
                  <Polyline positions={polylineCoords} color="#2563eb" weight={4} opacity={0.85} />
                )}
                {mapPoints.map((p, i) => (
                  <CircleMarker
                    key={`${p.lat}-${p.lng}-${i}`}
                    center={[p.lat, p.lng]}
                    radius={i === 0 || i === mapPoints.length - 1 ? 9 : 7}
                    pathOptions={{
                      color: i === 0 ? '#16a34a' : i === mapPoints.length - 1 ? '#dc2626' : '#2563eb',
                      fillColor: i === 0 ? '#16a34a' : i === mapPoints.length - 1 ? '#dc2626' : '#2563eb',
                      fillOpacity: 0.9,
                    }}
                  >
                    <Popup>{i + 1}. {p.label || `Stop ${i + 1}`}</Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </Card>

          <Card className="mt-4 overflow-x-auto p-0">
            <div className="border-b px-4 py-2 text-sm font-semibold">Recent optimization jobs</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left">Trip</th>
                  <th className="px-4 py-2 text-left">Distance</th>
                  <th className="px-4 py-2 text-left">ETA</th>
                  <th className="px-4 py-2 text-left">Savings</th>
                  <th className="px-4 py-2 text-left">Provider</th>
                  <th className="px-4 py-2 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No jobs yet — run an optimization</td></tr>
                ) : jobs.map((j) => (
                  <tr key={j.id} className="border-t">
                    <td className="px-4 py-2">{j.tripCode ?? 'Ad-hoc'}</td>
                    <td className="px-4 py-2">{fmtKm(j.originalDistanceKm)} → {fmtKm(j.optimizedDistanceKm)}</td>
                    <td className="px-4 py-2">{fmtMin(j.optimizedEtaMinutes)}</td>
                    <td className="px-4 py-2">{j.savingsPct != null ? `${j.savingsPct}%` : '—'}</td>
                    <td className="px-4 py-2">{j.provider}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{j.createdAt ? new Date(j.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </ERPContentPage>
  )
}
