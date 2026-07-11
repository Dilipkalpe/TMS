import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, MapPin, Share2 } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { portalApi } from '../../services/api'
import { APP_BASE_PATH } from '../../config/api'
import { useToast } from '../../context/ToastContext'
import PortalTrackMap from './PortalTrackMap'

const POLL_MS = 15000

function formatEta(eta) {
  if (!eta?.estimatedArrival) return '—'
  const d = new Date(eta.estimatedArrival)
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function PortalTrackPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await portalApi.tracking(id)
      setData(res)
    } catch (e) {
      toast({ title: 'Tracking unavailable', message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  const share = async () => {
    try {
      const r = await portalApi.shareLink(id)
      const base = APP_BASE_PATH.replace(/\/$/, '')
      const url = `${window.location.origin}${base}${r.path}`
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link copied', message: 'Shareable tracking link copied (valid 7 days).', type: 'success' })
    } catch (e) {
      toast({ title: 'Share failed', message: e.message, type: 'error' })
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading tracking…</p>
  if (!data) return <p className="text-sm text-red-600">Shipment not found.</p>

  const { shipment, livePosition, timeline, routeTrail, eta, pod, trip } = data

  return (
    <div>
      <Link to="/portal" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to shipments
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{shipment.shipmentCode}</h1>
          <p className="text-sm text-slate-500">{shipment.origin} → {shipment.destination}</p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{shipment.status}</span>
        </div>
        <Button variant="outline" size="sm" icon={Share2} onClick={share}>Share link</Button>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> Live map</p>
          <PortalTrackMap live={livePosition} trail={routeTrail} />
          {!livePosition && <p className="mt-2 text-xs text-slate-500">GPS will appear when the vehicle is assigned and transmitting.</p>}
        </Card>
        <Card className="space-y-3 p-4">
          <div>
            <p className="text-xs uppercase text-slate-500">Estimated arrival</p>
            <p className="flex items-center gap-2 text-lg font-semibold"><Clock className="h-4 w-4" />{formatEta(eta)}</p>
            {eta?.source && <p className="text-xs text-slate-500">{eta.source}{eta.minutesRemaining != null && ` · ~${eta.minutesRemaining} min`}</p>}
          </div>
          {shipment.vehicleNumber && (
            <div>
              <p className="text-xs uppercase text-slate-500">Vehicle</p>
              <p className="font-medium">{shipment.vehicleNumber}</p>
            </div>
          )}
          {shipment.driverName && (
            <div>
              <p className="text-xs uppercase text-slate-500">Driver</p>
              <p className="font-medium">{shipment.driverName}</p>
              {trip?.driverPhone && <p className="text-sm text-slate-500">{trip.driverPhone}</p>}
            </div>
          )}
          {pod?.verified && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              Delivered {pod.deliveredAt ? new Date(pod.deliveredAt).toLocaleString() : ''}
              {pod.recipientName && ` · ${pod.recipientName}`}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <p className="mb-3 font-medium">Shipment timeline</p>
        <ol className="space-y-3 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
          {timeline.map((ev, i) => (
            <li key={`${ev.status}-${i}`} className="relative">
              <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="font-medium">{ev.status}</p>
              <p className="text-xs text-slate-500">{new Date(ev.at).toLocaleString()}{ev.note ? ` · ${ev.note}` : ''}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
