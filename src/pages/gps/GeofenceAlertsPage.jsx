import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import GpsNav from './GpsNav'
import { geofenceApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function GeofenceAlertsPage() {
  const { toast } = useToast()
  const [params] = useSearchParams()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState(params.get('eventId') ? 'all' : 'unack')

  const load = useCallback(async () => {
    try {
      const q = filter === 'unack' ? { acknowledged: false, limit: 100 } : { limit: 100 }
      setRows(await geofenceApi.events(q))
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
    }
  }, [filter, toast])

  useEffect(() => { load() }, [load])

  const ack = async (id) => {
    try {
      await geofenceApi.acknowledge(id)
      toast({ title: 'Acknowledged', type: 'success' })
      load()
    } catch (e) {
      toast({ title: 'Failed', message: e.message, type: 'error' })
    }
  }

  const highlightId = params.get('eventId')

  return (
    <ERPContentPage module="Operations" title="Geofence Alerts">
      <GpsNav />
      <div className="mb-4 flex gap-2">
        {['unack', 'all'].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === f ? 'bg-primary text-white' : 'border'}`}>
            {f === 'unack' ? 'Unacknowledged' : 'All events'}
          </button>
        ))}
        <Button variant="secondary" onClick={load}>Refresh</Button>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Vehicle</th>
              <th className="px-4 py-2 text-left">Zone</th>
              <th className="px-4 py-2 text-left">Event</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={`border-t ${highlightId === e.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                <td className="px-4 py-2">{new Date(e.recordedAt).toLocaleString()}</td>
                <td className="px-4 py-2">{e.registrationNo}</td>
                <td className="px-4 py-2">{e.geofenceName}</td>
                <td className="px-4 py-2">
                  <Badge variant={e.eventType === 'EXIT' ? 'danger' : 'success'}>{e.eventType}</Badge>
                </td>
                <td className="px-4 py-2">{e.acknowledged ? 'Acknowledged' : 'Open'}</td>
                <td className="px-4 py-2 text-right">
                  {!e.acknowledged && (
                    <button type="button" onClick={() => ack(e.id)} className="text-primary hover:underline">Acknowledge</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No geofence events.</p>}
      </Card>
    </ERPContentPage>
  )
}
