import { useCallback, useEffect, useState } from 'react'
import { LogOut, MapPin, Navigation, Truck } from 'lucide-react'
import { driverPortalApi } from '../../services/api'
import { useDriverAuth } from '../../context/DriverAuthContext'
import { useDriverGeolocation } from '../../hooks/useDriverGeolocation'

const STATUS_LABELS = {
  ASSIGNED: 'ASSIGNED',
  STARTED: 'STARTED',
  REACHED_PICKUP: 'REACHED PICKUP',
  LOADING_COMPLETED: 'LOADING COMPLETED',
  IN_TRANSIT: 'IN TRANSIT',
  REACHED_DESTINATION: 'REACHED DESTINATION',
  DELIVERY_COMPLETED: 'DELIVERY COMPLETED',
}

const WORKFLOW = [
  { status: 'REACHED_PICKUP', label: 'Reached Pickup' },
  { status: 'LOADING_COMPLETED', label: 'Loading Completed' },
  { status: 'IN_TRANSIT', label: 'In Transit' },
  { status: 'REACHED_DESTINATION', label: 'Reached Destination' },
  { status: 'DELIVERY_COMPLETED', label: 'Delivery Completed' },
]

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">{value || '—'}</span>
    </div>
  )
}

function locationLabel(geo, trackingEnabled, tripStatus) {
  if (tripStatus === 'DELIVERY_COMPLETED') return 'Trip Completed'
  if (!trackingEnabled) return 'Not Started'
  if (geo.status === 'denied') return 'Location Permission Denied'
  if (geo.status === 'unavailable') return 'GPS Unavailable'
  if (geo.status === 'offline') return 'Network Unavailable'
  if (geo.status === 'stale') return 'Location Stale'
  if (geo.status === 'active' && geo.lastFix) {
    return geo.lastFix.latitude != null
      ? `${Number(geo.lastFix.latitude).toFixed(5)}, ${Number(geo.lastFix.longitude).toFixed(5)}`
      : 'Tracking Active'
  }
  if (geo.status === 'requesting') return 'Requesting permission…'
  return geo.message || 'Tracking Active'
}

export default function DriverTripPage() {
  const { profile, logout } = useDriverAuth()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPermissionHelp, setShowPermissionHelp] = useState(false)

  const trackingEnabled = !!trip?.trackingActive && trip?.status !== 'DELIVERY_COMPLETED'

  const geo = useDriverGeolocation({
    sessionId: trip?.sessionId,
    enabled: trackingEnabled,
    onError: (err) => setError(err.message || 'Location error'),
  })

  const loadTrip = useCallback(async () => {
    try {
      const res = await driverPortalApi.getTrip()
      setTrip(res.trip || null)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load trip')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrip()
    const id = setInterval(loadTrip, 60_000)
    return () => clearInterval(id)
  }, [loadTrip])

  const startTrip = async () => {
    if (!trip?.sessionId) return
    setShowPermissionHelp(true)
    setBusy(true)
    setError('')
    try {
      const res = await driverPortalApi.startTrip(trip.sessionId)
      setTrip(res.trip)
    } catch (err) {
      setError(err.message || 'Could not start trip')
    } finally {
      setBusy(false)
    }
  }

  const updateStatus = async (status) => {
    if (!trip?.sessionId) return
    setBusy(true)
    setError('')
    try {
      const res = await driverPortalApi.updateStatus(trip.sessionId, status)
      setTrip(res.trip)
    } catch (err) {
      setError(err.message || 'Status update failed')
    } finally {
      setBusy(false)
    }
  }

  const statusIndex = WORKFLOW.findIndex((w) => w.status === trip?.status)
  const locText = locationLabel(geo, trackingEnabled, trip?.status)
  const lastUpdated = geo.lastFix?.gpsTimestamp
    ? new Date(geo.lastFix.gpsTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : trackingEnabled ? '—' : '—'

  return (
    <div className="min-h-dvh bg-slate-100 pb-8">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-slate-900 px-4 py-3 text-white shadow">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{profile?.name || 'Driver'}</p>
            <p className="text-xs text-slate-300">MY TRIP</p>
          </div>
        </div>
        <button type="button" onClick={logout} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4">
        {loading && <p className="py-12 text-center text-sm text-slate-500">Loading trip…</p>}

        {!loading && !trip && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <Navigation className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-slate-800">No active trip</p>
            <p className="mt-2 text-sm text-slate-500">
              After a Loading Slip assigns your vehicle, the trip appears here.
            </p>
            <button
              type="button"
              onClick={loadTrip}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
            >
              Refresh
            </button>
          </div>
        )}

        {trip && (
          <>
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-600">MY TRIP</h2>
              <Row label="Driver" value={profile?.name || trip.driverName} />
              <Row label="Vehicle" value={trip.vehicleNumber} />
              <Row label="Loading Slip" value={trip.loadingSlipNumber || trip.lrNumber} />
              <Row label="From" value={trip.source} />
              <Row label="To" value={trip.destination} />
              <Row label="Current Status" value={STATUS_LABELS[trip.status] || trip.status} />
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-3">
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" /> Location
                </span>
                <span className="text-right text-sm font-semibold text-slate-900">{locText}</span>
              </div>
              <Row label="Last Updated" value={lastUpdated} />
              {geo.lastFix?.poorAccuracy && trackingEnabled && (
                <p className="pb-2 text-xs text-amber-700">Weak GPS accuracy — keep phone outdoors if possible.</p>
              )}
              {geo.status === 'stale' && (
                <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Location tracking temporarily unavailable
                </p>
              )}
            </section>

            {showPermissionHelp && trip.status === 'ASSIGNED' && !trip.trackingActive && (
              <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
                Location is required for vehicle tracking. After you tap Start Trip, your browser will ask for location permission.
                Tracking runs only while this page stays open.
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="mt-4 space-y-3">
              {(trip.status === 'ASSIGNED' || (!trip.trackingActive && trip.status !== 'DELIVERY_COMPLETED')) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={startTrip}
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 text-base font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
                >
                  Start Trip
                </button>
              )}

              {WORKFLOW.map((step, idx) => {
                if (trip.status === 'ASSIGNED' && !trip.trackingActive) return null
                const done = statusIndex >= idx || trip.status === step.status
                const isNext = trip.status !== 'DELIVERY_COMPLETED'
                  && (trip.status === 'STARTED' || trip.status === 'ASSIGNED' ? idx === 0 : statusIndex + 1 === idx)
                return (
                  <button
                    key={step.status}
                    type="button"
                    disabled={busy || done || !isNext}
                    onClick={() => updateStatus(step.status)}
                    className={`flex h-14 w-full items-center justify-center rounded-2xl text-base font-bold shadow-sm active:scale-[0.98] disabled:opacity-40 ${
                      done
                        ? 'bg-slate-200 text-slate-600'
                        : isNext
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-400 ring-1 ring-slate-200'
                    }`}
                  >
                    {done && trip.status !== step.status ? `✓ ${step.label}` : step.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
