import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Truck } from 'lucide-react'
import Card from '../../components/ui/Card'
import { portalApi } from '../../services/api'
import PortalTrackMap from './PortalTrackMap'

export default function PortalPublicTrack() {
  const { bookingId } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Missing tracking token')
      return
    }
    portalApi.publicTrack(bookingId, token)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [bookingId, token])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Link to="/portal/login" className="mt-4 inline-block text-sm text-primary underline">Customer login</Link>
        </Card>
      </div>
    )
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>
  }

  const { shipment, livePosition, routeTrail, eta, timeline } = data

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-2 text-primary">
          <Truck className="h-5 w-5" />
          <span className="font-semibold">Shipment tracking</span>
        </div>
        <Card className="mb-4 p-4">
          <h1 className="text-xl font-bold">{shipment.shipmentCode}</h1>
          <p className="text-sm text-slate-500">{shipment.origin} → {shipment.destination}</p>
          <p className="mt-2 text-sm">Status: <strong>{shipment.status}</strong></p>
          {eta && <p className="text-sm text-slate-600">ETA: {new Date(eta.estimatedArrival).toLocaleString()}</p>}
        </Card>
        <Card className="mb-4 p-4">
          <PortalTrackMap live={livePosition} trail={routeTrail} />
        </Card>
        <Card className="p-4">
          <p className="mb-2 font-medium">Timeline</p>
          <ul className="space-y-2 text-sm">
            {timeline.map((ev, i) => (
              <li key={i}>{new Date(ev.at).toLocaleString()} — {ev.status}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
