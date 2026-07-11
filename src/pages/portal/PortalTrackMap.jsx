import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = [19.076, 72.8777]

function FitBounds({ points, live }) {
  const map = useMap()
  useEffect(() => {
    const coords = [...points.map((p) => [p.lat, p.lng])]
    if (live) coords.push([live.lat, live.lng])
    if (coords.length === 0) return
    if (coords.length === 1) {
      map.setView(coords[0], 12)
      return
    }
    map.fitBounds(coords, { padding: [40, 40] })
  }, [points, live, map])
  return null
}

export default function PortalTrackMap({ live, trail = [] }) {
  const center = live ? [live.lat, live.lng] : trail.length ? [trail[trail.length - 1].lat, trail[trail.length - 1].lng] : DEFAULT_CENTER

  return (
    <div className="h-72 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <MapContainer center={center} zoom={8} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={trail} live={live} />
        {trail.length > 1 && (
          <Polyline positions={trail.map((p) => [p.lat, p.lng])} color="#2563eb" weight={4} opacity={0.7} />
        )}
        {live && (
          <CircleMarker center={[live.lat, live.lng]} radius={10} pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.9 }}>
            <Popup>
              Live position<br />
              {live.speedKmh != null && `${Math.round(live.speedKmh)} km/h`}
              {live.isStale && <><br /><strong className="text-amber-600">Signal stale</strong></>}
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  )
}
