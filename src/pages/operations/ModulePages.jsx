import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import VehicleLookupSelect from '../../components/ui/VehicleLookupSelect'
import { formatCurrency } from '../../components/ui/ReportFilters'
import {
  fuelApi, gpsApi, podApi, customerPortalApi, tripsApi, shipmentsApi,
  financeApi, documentsApi, notificationsApi, analyticsApi, marketplaceApi,
  warehouseApi, iotApi, aiApi, vehiclesApi, bookingsApi,
} from '../../services/api'
import { useToast } from '../../context/ToastContext'

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'

function SuspiciousFuelAlerts() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fuelApi.suspicious()
      .then(setRows)
      .catch((e) => toast({ title: 'Failed to load alerts', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [toast])

  if (loading) return <Card className="p-4 text-sm text-slate-500">Loading suspicious entries…</Card>
  if (rows.length === 0) return <Card className="p-4 text-sm text-slate-500">No suspicious fuel entries.</Card>

  return (
    <Card className="p-4">
      <p className="mb-2 font-medium">Suspicious fuel entries</p>
      <ul className="space-y-2 text-sm">
        {rows.map((e) => (
          <li key={e.id}>{e.vehicle?.registrationNo} — {e.liters}L on {String(e.filledAt).slice(0, 10)}</li>
        ))}
      </ul>
    </Card>
  )
}

export function FuelPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('overview')
  const [entries, setEntries] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({ vehicleId: '', liters: '', costPerLiter: '95', odometer: '', stationName: '' })

  const load = useCallback(async () => {
    try {
      const [e, a, v] = await Promise.all([fuelApi.entries(), fuelApi.analytics(), vehiclesApi.list({ pageSize: 200 })])
      setEntries(e)
      setAnalytics(a)
      setVehicles(v.items ?? v ?? [])
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const refreshVehicles = useCallback(async () => {
    const v = await vehiclesApi.list({ pageSize: 200 })
    const list = v.items ?? v ?? []
    setVehicles(list)
    return list
  }, [])

  const submit = async (ev) => {
    ev.preventDefault()
    try {
      await fuelApi.addEntry({
        vehicleId: form.vehicleId,
        liters: Number(form.liters),
        costPerLiter: Number(form.costPerLiter),
        odometer: form.odometer ? Number(form.odometer) : undefined,
        stationName: form.stationName || undefined,
      })
      toast({ title: 'Fuel entry saved', type: 'success' })
      load()
      setTab('entries')
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Fuel Management">
      <div className="mb-4 flex flex-wrap gap-2">
        {['overview', 'entries', 'add', 'alerts'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? 'bg-primary text-white' : 'border'}`}>{t}</button>
        ))}
      </div>
      {tab === 'overview' && analytics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Total Liters', analytics.totalLiters],
            ['Total Cost', formatCurrency(analytics.totalCost)],
            ['Avg Mileage', `${analytics.avgMileageKmpl} km/l`],
            ['Suspicious', analytics.suspiciousCount],
          ].map(([l, v]) => (
            <Card key={l} className="p-4"><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold">{v}</p></Card>
          ))}
        </div>
      )}
      {tab === 'entries' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-right">Liters</th><th className="px-4 py-2 text-right">Cost</th><th className="px-4 py-2 text-left">Flag</th></tr></thead>
            <tbody>{entries.map((e) => (
              <tr key={e.id} className="border-t"><td className="px-4 py-2">{String(e.filledAt).slice(0, 10)}</td><td className="px-4 py-2">{e.vehicle?.registrationNo}</td><td className="px-4 py-2 text-right">{e.liters}</td><td className="px-4 py-2 text-right">{formatCurrency(e.totalCost)}</td><td className="px-4 py-2">{e.isSuspicious ? <Badge variant="danger">Suspicious</Badge> : '—'}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      {tab === 'alerts' && (
        <SuspiciousFuelAlerts />
      )}
      {tab === 'add' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={submit} className="space-y-3">
            <VehicleLookupSelect
              vehicles={vehicles}
              vehicleId={form.vehicleId}
              onVehicleIdChange={(id) => setForm({ ...form, vehicleId: id })}
              onVehiclesRefresh={refreshVehicles}
            />
            <input required type="number" placeholder="Liters" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} className={inputClass} />
            <input required type="number" placeholder="Cost per liter" value={form.costPerLiter} onChange={(e) => setForm({ ...form, costPerLiter: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Odometer km" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} className={inputClass} />
            <input placeholder="Station name" value={form.stationName} onChange={(e) => setForm({ ...form, stationName: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Save Entry</Button>
          </form>
        </Card>
      )}
    </ERPContentPage>
  )
}

export function GpsPage() {
  const { toast } = useToast()
  const [live, setLive] = useState([])
  useEffect(() => {
    gpsApi.live().then(setLive).catch((e) => toast({ title: 'GPS load failed', message: e.message, type: 'error' }))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="GPS Tracking">
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Last Lat</th><th className="px-4 py-2 text-left">Last Lng</th><th className="px-4 py-2 text-left">Speed</th><th className="px-4 py-2 text-left">Time</th></tr></thead>
          <tbody>{live.map((v) => (
            <tr key={v.vehicleId} className="border-t"><td className="px-4 py-2 font-medium">{v.registrationNo}</td><td className="px-4 py-2">{v.status}</td><td className="px-4 py-2">{v.lastTrack?.lat ?? '—'}</td><td className="px-4 py-2">{v.lastTrack?.lng ?? '—'}</td><td className="px-4 py-2">{v.lastTrack?.speedKmh ?? '—'}</td><td className="px-4 py-2">{v.lastTrack?.recordedAt ? String(v.lastTrack.recordedAt).slice(0, 19) : '—'}</td></tr>
          ))}</tbody>
        </table>
      </Card>
    </ERPContentPage>
  )
}

export function EpodPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState([])
  const [bookingId, setBookingId] = useState('')
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [recipient, setRecipient] = useState('')

  useEffect(() => {
    bookingsApi.list({ pageSize: 100 })
      .then((r) => setBookings(r.items ?? r ?? []))
      .catch((e) => toast({ title: 'Failed to load bookings', message: e.message, type: 'error' }))
  }, [toast])

  const sendOtp = async () => {
    try { const r = await podApi.sendOtp(bookingId); setDemoOtp(r.demoOtp ?? ''); toast({ title: 'OTP sent', type: 'success' }) }
    catch (e) { toast({ title: 'Failed', message: e.message, type: 'error' }) }
  }
  const confirm = async () => {
    try { await podApi.confirm(bookingId, { otpCode: otp, recipientName: recipient }); toast({ title: 'Delivery confirmed', type: 'success' }) }
    catch (e) { toast({ title: 'Failed', message: e.message, type: 'error' }) }
  }
  return (
    <ERPContentPage module="Operations" title="ePOD">
      <Card className="mx-auto max-w-lg space-y-3 p-6">
        <select required value={bookingId} onChange={(e) => setBookingId(e.target.value)} className={inputClass}>
          <option value="">Select booking…</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>{b.id} — {b.fromCity} → {b.toCity}</option>
          ))}
        </select>
        <Button onClick={sendOtp}>Send OTP</Button>
        {demoOtp && <p className="text-sm text-amber-700">Demo OTP: {demoOtp}</p>}
        <input placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className={inputClass} />
        <input placeholder="Recipient name" value={recipient} onChange={(e) => setRecipient(e.target.value)} className={inputClass} />
        <Button onClick={confirm}>Confirm Delivery</Button>
      </Card>
    </ERPContentPage>
  )
}

export function CustomerPortalPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    customerPortalApi.shipments()
      .then(setRows)
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="Customer Portal">
      <p className="mb-4 text-sm text-slate-500">
        Admin view of customer shipments. Customers sign in at{' '}
        <Link to="/portal/login" className="text-primary hover:underline">/portal/login</Link>
        {' · '}
        <Link to="/settings/portal-users" className="text-primary hover:underline">Provision portal users</Link>
      </p>
      <Card className="mb-4 p-4 text-sm">
        <p className="mb-2 font-semibold">Temporary demo logins (by branch)</p>
        <table className="w-full text-xs">
          <thead><tr className="text-left text-slate-500"><th className="pb-1">Branch</th><th>Customer</th><th>Phone</th><th>PIN</th><th>Booking</th></tr></thead>
          <tbody className="text-slate-700 dark:text-slate-300">
            <tr><td className="py-1">Mumbai HO</td><td>Reliance Logistics</td><td>9820012345</td><td>123456</td><td>BK-1042</td></tr>
            <tr><td className="py-1">Pune</td><td>Mahindra & Mahindra</td><td>9820045678</td><td>234567</td><td>BK-1039</td></tr>
            <tr><td className="py-1">Delhi</td><td>Tata Steel Ltd</td><td>9820023456</td><td>345678</td><td>BK-1041</td></tr>
          </tbody>
        </table>
      </Card>
      {loading ? <Card className="p-4 text-sm text-slate-500">Loading…</Card> : (
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">ID</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-left">Route</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-right">Freight</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t"><td className="px-4 py-2">{r.shipmentCode ?? r.id}</td><td className="px-4 py-2">{r.customer?.name}</td><td className="px-4 py-2">{r.origin} → {r.destination}</td><td className="px-4 py-2">{r.status}</td><td className="px-4 py-2 text-right">{formatCurrency(r.freightAmount)}</td></tr>
          ))}</tbody>
        </table>
      </Card>
      )}
    </ERPContentPage>
  )
}

export function TripsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    tripsApi.list()
      .then(setRows)
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="Trips">
      {loading ? <Card className="p-4 text-sm text-slate-500">Loading…</Card> : (
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Code</th><th className="px-4 py-2 text-left">Route</th><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-left">Driver</th><th className="px-4 py-2 text-left">Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t"><td className="px-4 py-2">{r.tripCode}</td><td className="px-4 py-2">{r.origin} → {r.destination}</td><td className="px-4 py-2">{r.vehicle?.registrationNo ?? '—'}</td><td className="px-4 py-2">{r.driver?.name ?? '—'}</td><td className="px-4 py-2">{r.status}</td></tr>
          ))}</tbody>
        </table>
      </Card>
      )}
    </ERPContentPage>
  )
}

export function ShipmentsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    shipmentsApi.list()
      .then(setRows)
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="Shipments">
      {loading ? <Card className="p-4 text-sm text-slate-500">Loading…</Card> : (
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Code</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-left">Route</th><th className="px-4 py-2 text-left">Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t"><td className="px-4 py-2">{r.shipmentCode}</td><td className="px-4 py-2">{r.customer?.name}</td><td className="px-4 py-2">{r.origin} → {r.destination}</td><td className="px-4 py-2">{r.status}</td></tr>
          ))}</tbody>
        </table>
      </Card>
      )}
    </ERPContentPage>
  )
}

export function FinanceModulePage() {
  const { toast } = useToast()
  const [summary, setSummary] = useState(null)
  const [invoices, setInvoices] = useState([])
  useEffect(() => {
    Promise.all([financeApi.summary(), financeApi.invoices()])
      .then(([s, inv]) => { setSummary(s); setInvoices(inv?.items ?? inv ?? []) })
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="Finance">
      {summary && (
        <div className="mb-4 grid gap-4 sm:grid-cols-4">
          {[[ 'Revenue', formatCurrency(summary.revenue) ], [ 'Expenses', formatCurrency(summary.expenses) ], [ 'Profit', formatCurrency(summary.profit) ], [ 'Pending Invoices', summary.pendingInvoices ]].map(([l, v]) => (
            <Card key={l} className="p-4"><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold">{v}</p></Card>
          ))}
        </div>
      )}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Invoice</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
          <tbody>{invoices.map((i) => (
            <tr key={i.id} className="border-t"><td className="px-4 py-2">{i.invoiceNo}</td><td className="px-4 py-2">{i.customer?.name ?? '—'}</td><td className="px-4 py-2">{i.status}</td><td className="px-4 py-2 text-right">{formatCurrency(i.totalAmount)}</td></tr>
          ))}</tbody>
        </table>
      </Card>
    </ERPContentPage>
  )
}

export function DocumentsPage() {
  const { toast } = useToast()
  const [data, setData] = useState(null)
  useEffect(() => {
    documentsApi.expiring()
      .then(setData)
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="Documents">
      <Card className="p-4">
        <p className="mb-2 font-medium">Expiring documents (30 days)</p>
        <ul className="space-y-1 text-sm">{(data?.documents ?? []).map((d) => <li key={d.id}>{d.title} — {d.expiresAt}</li>)}</ul>
        <p className="mb-2 mt-4 font-medium">Vehicle compliance</p>
        <ul className="space-y-1 text-sm">{(data?.vehicleCompliance ?? []).map((v) => <li key={v.id}>{v.number}: Insurance {v.insurance}, PUC {v.puc}</li>)}</ul>
      </Card>
    </ERPContentPage>
  )
}

export function NotificationsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  useEffect(() => {
    notificationsApi.list()
      .then(setRows)
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="Notifications">
      <p className="mb-4 text-sm"><Link to="/settings/notifications" className="text-primary hover:underline">Configure SMS & WhatsApp →</Link></p>
      <ul className="space-y-2">{rows.map((n) => (
        <Card key={n.id} className="p-3"><p className="font-medium">{n.title}</p><p className="text-sm text-slate-500">{n.body}</p></Card>
      ))}</ul>
    </ERPContentPage>
  )
}

export function AnalyticsPage() {
  const { toast } = useToast()
  const [util, setUtil] = useState(null)
  const [routes, setRoutes] = useState([])
  useEffect(() => {
    Promise.all([analyticsApi.fleetUtilization(), analyticsApi.routeProfitability()])
      .then(([u, r]) => { setUtil(u); setRoutes(r) })
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="Analytics">
      {util && <Card className="mb-4 p-4"><p>Fleet utilization: <strong>{util.utilizationPct}%</strong> ({util.onTrip}/{util.total} on trip)</p></Card>}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm"><thead><tr><th className="px-4 py-2 text-left">Origin</th><th className="px-4 py-2 text-left">Destination</th><th className="px-4 py-2 text-right">Distance km</th></tr></thead>
          <tbody>{routes.map((r, i) => <tr key={i} className="border-t"><td className="px-4 py-2">{r.origin}</td><td className="px-4 py-2">{r.destination}</td><td className="px-4 py-2 text-right">{r.distanceKm ?? '—'}</td></tr>)}</tbody></table>
      </Card>
    </ERPContentPage>
  )
}

export function MarketplacePage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  useEffect(() => {
    marketplaceApi.listings()
      .then(setRows)
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="Marketplace">
      <div className="grid gap-4 md:grid-cols-2">{rows.map((l) => (
        <Card key={l.id} className="p-4"><p className="font-semibold">{l.listingType}: {l.origin} → {l.destination}</p><p className="text-sm text-slate-500">Rate: {formatCurrency(l.rate ?? 0)} · Bids: {l.bidCount ?? l.bids?.length ?? 0}</p></Card>
      ))}</div>
    </ERPContentPage>
  )
}

export function WarehousePage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  useEffect(() => {
    warehouseApi.list()
      .then(setRows)
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="Warehouse">
      {rows.map((w) => (
        <Card key={w.id} className="mb-4 p-4"><p className="font-semibold">{w.name}</p><p className="text-sm text-slate-500">{w.address}</p><p className="text-sm">Items: {w.inventory?.length ?? 0}</p></Card>
      ))}
    </ERPContentPage>
  )
}

export function IotPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  useEffect(() => {
    iotApi.devices()
      .then(setRows)
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
  }, [toast])
  return (
    <ERPContentPage module="Operations" title="IoT">
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm"><thead><tr><th className="px-4 py-2 text-left">Serial</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-left">Last seen</th></tr></thead>
          <tbody>{rows.map((d) => <tr key={d.id} className="border-t"><td className="px-4 py-2">{d.deviceSerial}</td><td className="px-4 py-2">{d.deviceType}</td><td className="px-4 py-2">{d.vehicle?.number ?? '—'}</td><td className="px-4 py-2">{d.lastSeenAt ? String(d.lastSeenAt).slice(0, 19) : '—'}</td></tr>)}</tbody></table>
      </Card>
    </ERPContentPage>
  )
}

export function AiPage() {
  const { toast } = useToast()
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [forecasts, setForecasts] = useState([])
  useEffect(() => {
    aiApi.forecasts()
      .then(setForecasts)
      .catch((e) => toast({ title: 'Forecasts load failed', message: e.message, type: 'error' }))
  }, [toast])
  const send = async () => {
    try { const r = await aiApi.chat(message); setReply(r.reply); toast({ title: 'Sent', type: 'success' }) }
    catch (e) { toast({ title: 'Failed', message: e.message, type: 'error' }) }
  }
  return (
    <ERPContentPage module="Operations" title="AI Assistant">
      <Card className="mb-4 p-4 space-y-2">
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} rows={3} placeholder="Ask TMS assistant…" />
        <Button onClick={send}>Send</Button>
        {reply && <p className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">{reply}</p>}
      </Card>
      <Card className="p-4"><p className="mb-2 font-medium">Forecasts</p><ul className="text-sm space-y-1">{forecasts.map((f) => <li key={f.id}>{f.forecastType}: {formatCurrency(f.predictedValue)} ({f.periodStart} – {f.periodEnd})</li>)}</ul></Card>
    </ERPContentPage>
  )
}
