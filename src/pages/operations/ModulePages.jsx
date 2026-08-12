import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import VehicleLookupSelect from '../../components/ui/VehicleLookupSelect'
import { Select } from '../../components/ui/Input'
import { formatCurrency } from '../../components/ui/ReportFilters'
import {
  fuelApi, gpsApi, podApi, customerPortalApi, tripsApi, shipmentsApi,
  financeApi, documentsApi, notificationsApi, analyticsApi, marketplaceApi,
  warehouseApi, iotApi, aiApi, vehiclesApi, bookingsApi, driversApi, customersApi,
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
      setForm({ vehicleId: '', liters: '', costPerLiter: '95', odometer: '', stationName: '' })
      load()
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
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [podInfo, setPodInfo] = useState(null)

  useEffect(() => {
    bookingsApi.list({ pageSize: 100 })
      .then((r) => setBookings(r.items ?? r ?? []))
      .catch((e) => toast({ title: 'Failed to load bookings', message: e.message, type: 'error' }))
  }, [toast])

  useEffect(() => {
    if (!bookingId) {
      setPodInfo(null)
      return
    }
    podApi.get(bookingId)
      .then((info) => {
        setPodInfo(info)
        if (info?.recipientName) setRecipient(info.recipientName)
        if (info?.deliveryDate) setDeliveryDate(info.deliveryDate)
      })
      .catch(() => setPodInfo(null))
  }, [bookingId])

  const sendOtp = async () => {
    if (!bookingId) {
      toast({ title: 'Select a booking', type: 'warning' })
      return
    }
    try {
      const r = await podApi.sendOtp(bookingId)
      setDemoOtp(r.demoOtp ?? '')
      toast({
        title: podInfo?.alreadyDelivered ? 'OTP sent for re-delivery' : 'OTP sent',
        type: 'success',
      })
    } catch (e) {
      toast({ title: 'Failed', message: e.message, type: 'error' })
    }
  }

  const confirm = async () => {
    if (!bookingId) {
      toast({ title: 'Select a booking', type: 'warning' })
      return
    }
    if (!otp.trim() || !recipient.trim()) {
      toast({ title: 'OTP and recipient name are required', type: 'warning' })
      return
    }
    try {
      const res = await podApi.confirm(bookingId, {
        otpCode: otp,
        recipientName: recipient,
        deliveryDate,
      })
      toast({
        title: 'Delivery confirmed',
        message: `Date: ${res.deliveryDate || deliveryDate}`,
        type: 'success',
      })
      setOtp('')
      setDemoOtp('')
      const info = await podApi.get(bookingId)
      setPodInfo(info)
      const list = await bookingsApi.list({ pageSize: 100 })
      setBookings(list.items ?? list ?? [])
    } catch (e) {
      toast({ title: 'Failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="ePOD">
      <Card className="mx-auto max-w-lg space-y-3 p-6">
        <p className="text-sm text-slate-500">
          OTP-based proof of delivery. For delivery without OTP, use{' '}
          <Link to="/operations/pod" className="text-primary hover:underline">Operations → POD</Link>.
        </p>
        <Select
          required
          label={false}
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          placeholder="Select booking…"
          options={[
            { value: '', label: 'Select booking…' },
            ...bookings.map((b) => ({
              value: b.id,
              label: `${b.id} — ${b.fromCity} → ${b.toCity} (${b.status || '—'})`,
            })),
          ]}
        />
        {podInfo?.alreadyDelivered && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Already delivered{podInfo.deliveryDate ? ` on ${podInfo.deliveryDate}` : ''}.
            Send OTP again to re-mark with a new delivery date.
          </p>
        )}
        <Button onClick={sendOtp} disabled={!bookingId}>Send OTP</Button>
        {demoOtp && <p className="text-sm text-amber-700">Demo OTP: {demoOtp}</p>}
        <input placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className={inputClass} />
        <input placeholder="Recipient name" value={recipient} onChange={(e) => setRecipient(e.target.value)} className={inputClass} />
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
          Delivery date
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <Button onClick={confirm} disabled={!bookingId}>Confirm Delivery</Button>
      </Card>
    </ERPContentPage>
  )
}

/** Mark delivery by booking without OTP — supports re-mark with delivery date. */
export function PodPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState([])
  const [bookingId, setBookingId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')
  const [podInfo, setPodInfo] = useState(null)
  const [saving, setSaving] = useState(false)

  const reloadBookings = useCallback(() => {
    bookingsApi.list({ pageSize: 200 })
      .then((r) => setBookings(r.items ?? r ?? []))
      .catch((e) => toast({ title: 'Failed to load bookings', message: e.message, type: 'error' }))
  }, [toast])

  useEffect(() => { reloadBookings() }, [reloadBookings])

  useEffect(() => {
    if (!bookingId) {
      setPodInfo(null)
      return
    }
    podApi.get(bookingId)
      .then((info) => {
        setPodInfo(info)
        if (info?.recipientName) setRecipient(info.recipientName)
        if (info?.deliveryDate) setDeliveryDate(info.deliveryDate)
        else setDeliveryDate(new Date().toISOString().slice(0, 10))
      })
      .catch(() => setPodInfo(null))
  }, [bookingId])

  const markDelivered = async () => {
    if (!bookingId) {
      toast({ title: 'Select a booking', type: 'warning' })
      return
    }
    if (!deliveryDate) {
      toast({ title: 'Delivery date is required', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const res = await podApi.markDelivered(bookingId, {
        recipientName: recipient || 'Receiver',
        deliveryDate,
        remarks,
      })
      toast({
        title: res.remake ? 'Delivery re-marked' : 'Delivery marked',
        message: `${bookingId} · ${res.deliveryDate}`,
        type: 'success',
      })
      setRemarks('')
      const info = await podApi.get(bookingId)
      setPodInfo(info)
      reloadBookings()
    } catch (e) {
      toast({ title: 'Failed', message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Operations" title="POD — Mark Delivery">
      <Card className="mx-auto max-w-lg space-y-3 p-6">
        <p className="text-sm text-slate-500">
          Mark or re-mark delivery for a booking <strong>without OTP</strong>. Choose booking, delivery date, and save.
          For OTP proof use{' '}
          <Link to="/operations/epod" className="text-primary hover:underline">ePOD</Link>.
        </p>
        <Select
          required
          label={false}
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          placeholder="Select booking no…"
          options={[
            { value: '', label: 'Select booking no…' },
            ...bookings.map((b) => ({
              value: b.id,
              label: `${b.id} — ${b.fromCity} → ${b.toCity} (${b.status || '—'})`,
            })),
          ]}
        />
        {podInfo?.alreadyDelivered && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Already delivered{podInfo.deliveryDate ? ` on ${podInfo.deliveryDate}` : ''}.
            You can mark again with a new delivery date.
          </p>
        )}
        <input
          placeholder="Recipient name"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className={inputClass}
        />
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
          Delivery date
          <input
            type="date"
            required
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <input
          placeholder="Remarks (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className={inputClass}
        />
        <Button onClick={markDelivered} disabled={!bookingId || saving}>
          {saving ? 'Saving…' : podInfo?.alreadyDelivered ? 'Re-mark Delivery' : 'Mark Delivery'}
        </Button>
      </Card>
    </ERPContentPage>
  )
}

function TabBar({ tabs, tab, setTab }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${tab === t.id ? 'bg-primary text-white' : 'border'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function CustomerPortalPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('shipments')
  const [rows, setRows] = useState([])
  const [invoices, setInvoices] = useState([])
  const [track, setTrack] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ origin: '', destination: '', customerName: '', freightAmount: '', material: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, inv] = await Promise.all([customerPortalApi.shipments(), customerPortalApi.invoices()])
      setRows(s ?? [])
      setInvoices(inv ?? [])
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const createBooking = async (ev) => {
    ev.preventDefault()
    try {
      await customerPortalApi.createBooking({
        origin: form.origin,
        destination: form.destination,
        customerName: form.customerName,
        freightAmount: Number(form.freightAmount || 0),
        material: form.material || undefined,
      })
      toast({ title: 'Customer booking created', type: 'success' })
      setForm({ origin: '', destination: '', customerName: '', freightAmount: '', material: '' })
      load()
    } catch (e) {
      toast({ title: 'Create failed', message: e.message, type: 'error' })
    }
  }

  const openTrack = async (id) => {
    try {
      setTrack(await customerPortalApi.track(id))
      setTab('track')
    } catch (e) {
      toast({ title: 'Track failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Customer Portal">
      <p className="mb-4 text-sm text-slate-500">
        Admin operations for customer shipments. Customer self-service:{' '}
        <Link to="/portal/login" className="text-primary hover:underline">/portal/login</Link>
        {' · '}
        <Link to="/settings/portal-users" className="text-primary hover:underline">Portal users</Link>
      </p>
      <TabBar
        tab={tab}
        setTab={setTab}
        tabs={[
          { id: 'shipments', label: 'Shipments' },
          { id: 'create', label: 'New booking' },
          { id: 'invoices', label: 'Invoices' },
          { id: 'track', label: 'Tracking' },
        ]}
      />
      {tab === 'shipments' && (loading ? <Card className="p-4 text-sm text-slate-500">Loading…</Card> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">ID</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-left">Route</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-right">Freight</th><th className="px-4 py-2 text-left">Action</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.shipmentCode ?? r.id}</td>
                <td className="px-4 py-2">{r.customer?.name}</td>
                <td className="px-4 py-2">{r.origin} → {r.destination}</td>
                <td className="px-4 py-2"><Badge>{r.status}</Badge></td>
                <td className="px-4 py-2 text-right">{formatCurrency(r.freightAmount)}</td>
                <td className="px-4 py-2"><Button type="button" variant="secondary" onClick={() => openTrack(r.id)}>Track</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      ))}
      {tab === 'create' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={createBooking} className="space-y-3">
            <input required placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className={inputClass} />
            <input required placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className={inputClass} />
            <input required placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={inputClass} />
            <input required type="number" placeholder="Freight amount" value={form.freightAmount} onChange={(e) => setForm({ ...form, freightAmount: e.target.value })} className={inputClass} />
            <input placeholder="Material" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Create booking</Button>
          </form>
        </Card>
      )}
      {tab === 'invoices' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Invoice</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
            <tbody>{invoices.map((i) => (
              <tr key={i.id} className="border-t"><td className="px-4 py-2">{i.invoiceNo}</td><td className="px-4 py-2">{i.customer?.name ?? i.customerId ?? '—'}</td><td className="px-4 py-2">{i.status}</td><td className="px-4 py-2 text-right">{formatCurrency(i.totalAmount)}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      {tab === 'track' && (
        <Card className="p-4 text-sm">
          {!track ? <p className="text-slate-500">Select Track on a shipment.</p> : (
            <div className="space-y-2">
              <p><strong>Booking:</strong> {track.booking?.id} · {track.booking?.status}</p>
              <p><strong>Route:</strong> {track.booking?.fromCity} → {track.booking?.toCity}</p>
              <p><strong>Trip:</strong> {track.trip?.tripCode ?? '—'} ({track.trip?.status ?? 'not assigned'})</p>
              <p><strong>Vehicle/Driver:</strong> {track.trip?.vehicle?.number ?? track.trip?.vehicle?.registrationNo ?? '—'} / {track.trip?.driver?.name ?? '—'}</p>
              <p><strong>Last GPS:</strong> {track.lastGps ? `${track.lastGps.lat}, ${track.lastGps.lng} @ ${String(track.lastGps.recordedAt).slice(0, 19)}` : '—'}</p>
              <p><strong>POD:</strong> {track.pod ? `${track.pod.status ?? 'available'}` : 'not available'}</p>
            </div>
          )}
        </Card>
      )}
    </ERPContentPage>
  )
}

export function TripsPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('list')
  const [rows, setRows] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ origin: '', destination: '', vehicleId: '', driverId: '', plannedStart: '', plannedEnd: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, v, d] = await Promise.all([
        tripsApi.list(),
        vehiclesApi.list({ pageSize: 200 }),
        driversApi.list({ pageSize: 200 }),
      ])
      setRows(t ?? [])
      setVehicles(v.items ?? v ?? [])
      setDrivers(d.items ?? d ?? [])
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const create = async (ev) => {
    ev.preventDefault()
    try {
      await tripsApi.create({
        origin: form.origin,
        destination: form.destination,
        vehicleId: form.vehicleId || undefined,
        driverId: form.driverId || undefined,
        plannedStart: form.plannedStart || undefined,
        plannedEnd: form.plannedEnd || undefined,
      })
      toast({ title: 'Trip created', type: 'success' })
      setForm({ origin: '', destination: '', vehicleId: '', driverId: '', plannedStart: '', plannedEnd: '' })
      load()
    } catch (e) {
      toast({ title: 'Create failed', message: e.message, type: 'error' })
    }
  }

  const setStatus = async (id, status) => {
    try {
      await tripsApi.updateStatus(id, { status })
      toast({ title: `Status → ${status}`, type: 'success' })
      load()
    } catch (e) {
      toast({ title: 'Update failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Trips">
      <p className="mb-3 text-sm text-slate-500">
        Trip numbers auto-generate on save. Use with{' '}
        <Link to="/operations/routing" className="text-primary hover:underline">Route Optimizer</Link>.
      </p>
      <TabBar tab={tab} setTab={setTab} tabs={[{ id: 'list', label: 'Trips' }, { id: 'create', label: 'Create trip' }]} />
      {tab === 'list' && (loading ? <Card className="p-4 text-sm text-slate-500">Loading…</Card> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Code</th><th className="px-4 py-2 text-left">Branch</th><th className="px-4 py-2 text-left">Route</th><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-left">Driver</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Actions</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.tripCode}</td>
                <td className="px-4 py-2">{r.branchName || '—'}</td>
                <td className="px-4 py-2">{r.origin} → {r.destination}</td>
                <td className="px-4 py-2">{r.vehicle?.registrationNo ?? '—'}</td>
                <td className="px-4 py-2">{r.driver?.name ?? '—'}</td>
                <td className="px-4 py-2"><Badge>{r.status}</Badge></td>
                <td className="px-4 py-2 space-x-1">
                  {r.status !== 'IN_TRANSIT' && r.status !== 'COMPLETED' && <Button type="button" variant="secondary" onClick={() => setStatus(r.id, 'IN_TRANSIT')}>Start</Button>}
                  {r.status === 'IN_TRANSIT' && <Button type="button" variant="secondary" onClick={() => setStatus(r.id, 'COMPLETED')}>Complete</Button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      ))}
      {tab === 'create' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={create} className="space-y-3">
            <input required placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className={inputClass} />
            <input required placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={inputClass} />
            <Select label="Vehicle" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} options={[{ value: '', label: 'Optional' }, ...vehicles.map((v) => ({ value: v.id, label: v.number || v.registrationNo }))]} />
            <Select label="Driver" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} options={[{ value: '', label: 'Optional' }, ...drivers.map((d) => ({ value: d.id, label: d.name }))]} />
            <input type="datetime-local" value={form.plannedStart} onChange={(e) => setForm({ ...form, plannedStart: e.target.value })} className={inputClass} />
            <input type="datetime-local" value={form.plannedEnd} onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Create trip</Button>
          </form>
        </Card>
      )}
    </ERPContentPage>
  )
}

export function ShipmentsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [track, setTrack] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await shipmentsApi.list()) }
    catch (e) { toast({ title: 'Load failed', message: e.message, type: 'error' }) }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase()
    if (!s) return true
    return [r.shipmentCode, r.customer?.name, r.origin, r.destination, r.status].join(' ').toLowerCase().includes(s)
  })

  const openTrack = async (id) => {
    try { setTrack(await shipmentsApi.track(id)) }
    catch (e) { toast({ title: 'Track failed', message: e.message, type: 'error' }) }
  }

  return (
    <ERPContentPage module="Operations" title="Shipments">
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search code, customer, route…" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputClass} max-w-md`} />
        <Button type="button" variant="secondary" onClick={load}>Refresh</Button>
        <Link to="/bookings/new"><Button type="button">New booking</Button></Link>
      </div>
      {loading ? <Card className="p-4 text-sm text-slate-500">Loading…</Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Code</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-left">Route</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left" /></tr></thead>
              <tbody>{filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.shipmentCode}</td>
                  <td className="px-4 py-2">{r.customer?.name}</td>
                  <td className="px-4 py-2">{r.origin} → {r.destination}</td>
                  <td className="px-4 py-2"><Badge>{r.status}</Badge></td>
                  <td className="px-4 py-2"><Button type="button" variant="secondary" onClick={() => openTrack(r.id)}>Track</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
          <Card className="p-4 text-sm">
            <p className="mb-2 font-medium">Tracking detail</p>
            {!track ? <p className="text-slate-500">Select a shipment to track trip & POD.</p> : (
              <div className="space-y-2">
                <p><strong>Booking:</strong> {track.booking?.id} · {track.booking?.status}</p>
                <p><strong>Trip:</strong> {track.trip?.tripCode ?? '—'} ({track.trip?.status ?? 'n/a'})</p>
                <p><strong>Vehicle:</strong> {track.trip?.vehicle?.number ?? track.trip?.vehicle?.registrationNo ?? '—'}</p>
                <p><strong>Driver:</strong> {track.trip?.driver?.name ?? '—'}</p>
                <p><strong>POD:</strong> {track.pod ? 'Available' : 'Not yet'}</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </ERPContentPage>
  )
}

export function FinanceModulePage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('overview')
  const [summary, setSummary] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({ customerId: '', amount: '', taxAmount: '0', description: 'Freight charges' })

  const load = useCallback(async () => {
    try {
      const [s, inv, exp, cust] = await Promise.all([
        financeApi.summary(),
        financeApi.invoices(),
        financeApi.expenses(),
        customersApi.list({ pageSize: 200 }),
      ])
      setSummary(s)
      setInvoices(inv?.items ?? inv ?? [])
      setExpenses(exp ?? [])
      setCustomers(cust.items ?? cust ?? [])
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const createInvoice = async (ev) => {
    ev.preventDefault()
    try {
      await financeApi.createInvoice({
        customerId: form.customerId,
        amount: Number(form.amount || 0),
        taxAmount: Number(form.taxAmount || 0),
        lines: [{ description: form.description || 'Freight', quantity: 1, unitPrice: Number(form.amount || 0) }],
      })
      toast({ title: 'Invoice created', type: 'success' })
      setForm({ customerId: '', amount: '', taxAmount: '0', description: 'Freight charges' })
      load()
    } catch (e) {
      toast({ title: 'Create failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Finance">
      <TabBar tab={tab} setTab={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'invoices', label: 'Invoices' }, { id: 'expenses', label: 'Expenses' }, { id: 'create', label: 'New invoice' }]} />
      {tab === 'overview' && summary && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[['Revenue', formatCurrency(summary.revenue)], ['Expenses', formatCurrency(summary.expenses)], ['Profit', formatCurrency(summary.profit)], ['Pending Invoices', summary.pendingInvoices]].map(([l, v]) => (
            <Card key={l} className="p-4"><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold">{v}</p></Card>
          ))}
        </div>
      )}
      {tab === 'invoices' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Invoice</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
            <tbody>{invoices.map((i) => (
              <tr key={i.id} className="border-t"><td className="px-4 py-2">{i.invoiceNo}</td><td className="px-4 py-2">{i.customer?.name ?? '—'}</td><td className="px-4 py-2">{i.status}</td><td className="px-4 py-2 text-right">{formatCurrency(i.totalAmount)}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      {tab === 'expenses' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-left">Note</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
            <tbody>{expenses.map((e) => (
              <tr key={e.id} className="border-t"><td className="px-4 py-2">{String(e.expenseDate).slice(0, 10)}</td><td className="px-4 py-2">{e.category ?? e.type ?? '—'}</td><td className="px-4 py-2">{e.notes ?? e.description ?? '—'}</td><td className="px-4 py-2 text-right">{formatCurrency(e.amount)}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      {tab === 'create' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={createInvoice} className="space-y-3">
            <Select label="Customer" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={[{ value: '', label: 'Select customer' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
            <input required type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Tax" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} className={inputClass} />
            <input placeholder="Line description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Create invoice</Button>
          </form>
        </Card>
      )}
    </ERPContentPage>
  )
}

export function DocumentsPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('all')
  const [docs, setDocs] = useState([])
  const [expiring, setExpiring] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({ entityType: 'Vehicle', entityId: '', docType: 'Insurance', title: '', fileUrl: '', expiresAt: '' })

  const load = useCallback(async () => {
    const [allRes, expRes, vRes] = await Promise.allSettled([
      documentsApi.list(),
      documentsApi.expiring(30),
      vehiclesApi.list({ pageSize: 200 }),
    ])
    if (allRes.status === 'fulfilled') setDocs(allRes.value ?? [])
    else {
      setDocs([])
      toast({ title: 'Documents list failed', message: allRes.reason?.message || 'Unable to load documents', type: 'error' })
    }
    if (expRes.status === 'fulfilled') setExpiring(expRes.value)
    else toast({ title: 'Expiring docs failed', message: expRes.reason?.message || 'Unable to load expiring docs', type: 'error' })
    if (vRes.status === 'fulfilled') setVehicles(vRes.value?.items ?? vRes.value ?? [])
  }, [toast])

  useEffect(() => { load() }, [load])

  const save = async (ev) => {
    ev.preventDefault()
    try {
      await documentsApi.save({
        entityType: form.entityType,
        entityId: form.entityId,
        docType: form.docType,
        title: form.title,
        fileUrl: form.fileUrl || undefined,
        expiresAt: form.expiresAt || undefined,
      })
      toast({ title: 'Document saved', type: 'success' })
      setForm({ entityType: 'Vehicle', entityId: '', docType: 'Insurance', title: '', fileUrl: '', expiresAt: '' })
      load()
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Documents">
      <TabBar tab={tab} setTab={setTab} tabs={[{ id: 'all', label: 'All docs' }, { id: 'expiring', label: 'Expiring' }, { id: 'add', label: 'Add document' }]} />
      {tab === 'all' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Title</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Entity</th><th className="px-4 py-2 text-left">Expires</th></tr></thead>
            <tbody>{docs.map((d) => (
              <tr key={d.id} className="border-t"><td className="px-4 py-2">{d.title}</td><td className="px-4 py-2">{d.docType}</td><td className="px-4 py-2">{d.entityType}:{d.entityId}</td><td className="px-4 py-2">{d.expiresAt ?? '—'}</td></tr>
            ))}</tbody>
          </table>
          {docs.length === 0 && <p className="p-4 text-sm text-slate-500">No documents yet. Use Add document.</p>}
        </Card>
      )}
      {tab === 'expiring' && (
        <Card className="p-4 space-y-4">
          <div>
            <p className="mb-2 font-medium">Expiring documents (30 days)</p>
            <ul className="space-y-1 text-sm">{(expiring?.documents ?? []).map((d) => <li key={d.id}>{d.title} — {d.expiresAt}</li>)}</ul>
            {(expiring?.documents ?? []).length === 0 && <p className="text-sm text-slate-500">None expiring soon.</p>}
          </div>
          <div>
            <p className="mb-2 font-medium">Vehicle compliance alerts</p>
            <ul className="space-y-1 text-sm">{(expiring?.vehicleCompliance ?? []).map((v) => (
              <li key={v.id}>{v.number}: Insurance {v.insurance ?? '—'}, Fitness {v.fitness ?? '—'}, Permit {v.permit ?? '—'}, PUC {v.puc ?? '—'}</li>
            ))}</ul>
          </div>
        </Card>
      )}
      {tab === 'add' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={save} className="space-y-3">
            <Select label="Entity type" value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })} options={[{ value: 'Vehicle', label: 'Vehicle' }, { value: 'Driver', label: 'Driver' }, { value: 'Company', label: 'Company' }]} />
            {form.entityType === 'Vehicle' ? (
              <Select label="Vehicle" value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} options={[{ value: '', label: 'Select vehicle' }, ...vehicles.map((v) => ({ value: v.id, label: v.number || v.registrationNo }))]} />
            ) : (
              <input required placeholder="Entity ID" value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} className={inputClass} />
            )}
            <input required placeholder="Doc type (Insurance, PUC…)" value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })} className={inputClass} />
            <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            <input placeholder="File URL (optional)" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} className={inputClass} />
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Save document</Button>
          </form>
        </Card>
      )}
    </ERPContentPage>
  )
}

export function NotificationsPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('inbox')
  const [rows, setRows] = useState([])
  const [outbox, setOutbox] = useState([])
  const [templates, setTemplates] = useState([])
  const [settings, setSettings] = useState(null)
  const [test, setTest] = useState({ channel: 'IN_APP', to: '', message: 'TMS Pro test notification' })

  const load = useCallback(async () => {
    try {
      const [inbox, out, tpl, ch] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.outbox().catch(() => []),
        notificationsApi.templates().catch(() => []),
        notificationsApi.channelSettings().catch(() => null),
      ])
      setRows(inbox ?? [])
      setOutbox(out?.items ?? out ?? [])
      setTemplates(tpl ?? [])
      setSettings(ch)
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id)
      load()
    } catch (e) {
      toast({ title: 'Update failed', message: e.message, type: 'error' })
    }
  }

  const sendTest = async (ev) => {
    ev.preventDefault()
    try {
      await notificationsApi.sendTest(test)
      toast({ title: 'Test sent', type: 'success' })
      setTest({ channel: 'IN_APP', to: '', message: 'TMS Pro test notification' })
      load()
    } catch (e) {
      toast({ title: 'Send failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Notifications">
      <p className="mb-3 text-sm"><Link to="/settings/notifications" className="text-primary hover:underline">Channel settings (SMS / WhatsApp) →</Link></p>
      <TabBar tab={tab} setTab={setTab} tabs={[{ id: 'inbox', label: 'Inbox' }, { id: 'outbox', label: 'Outbox' }, { id: 'templates', label: 'Templates' }, { id: 'test', label: 'Send test' }]} />
      {tab === 'inbox' && (
        <ul className="space-y-2">
          {rows.length === 0 && <Card className="p-4 text-sm text-slate-500">No notifications.</Card>}
          {rows.map((n) => (
            <Card key={n.id} className="flex items-start justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{n.title} {n.status === 'UNREAD' && <Badge variant="warning">Unread</Badge>}</p>
                <p className="text-sm text-slate-500">{n.body}</p>
              </div>
              {n.status === 'UNREAD' && <Button type="button" variant="secondary" onClick={() => markRead(n.id)}>Mark read</Button>}
            </Card>
          ))}
        </ul>
      )}
      {tab === 'outbox' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left">Channel</th><th className="px-4 py-2 text-left">To</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">When</th></tr></thead>
            <tbody>{(Array.isArray(outbox) ? outbox : []).map((o, i) => (
              <tr key={o.id || i} className="border-t"><td className="px-4 py-2">{o.channel}</td><td className="px-4 py-2">{o.to ?? o.recipient ?? '—'}</td><td className="px-4 py-2">{o.status}</td><td className="px-4 py-2">{String(o.createdAt || o.sentAt || '').slice(0, 19)}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      {tab === 'templates' && (
        <div className="space-y-2">
          {settings && <Card className="p-3 text-sm">Channels: SMS {settings.smsEnabled ? 'on' : 'off'} · WhatsApp {settings.whatsAppEnabled ?? settings.whatsappEnabled ? 'on' : 'off'} · Email {settings.emailEnabled ? 'on' : 'off'}</Card>}
          {(templates ?? []).map((t) => (
            <Card key={t.id} className="p-3"><p className="font-medium">{t.name || t.code || t.id}</p><p className="text-sm text-slate-500 whitespace-pre-wrap">{t.body || t.content}</p></Card>
          ))}
          {(templates ?? []).length === 0 && <Card className="p-4 text-sm text-slate-500">No templates configured yet.</Card>}
        </div>
      )}
      {tab === 'test' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={sendTest} className="space-y-3">
            <Select label="Channel" value={test.channel} onChange={(e) => setTest({ ...test, channel: e.target.value })} options={[{ value: 'IN_APP', label: 'In-app' }, { value: 'SMS', label: 'SMS' }, { value: 'EMAIL', label: 'Email' }, { value: 'WHATSAPP', label: 'WhatsApp' }]} />
            <input placeholder="To (phone/email, optional for in-app)" value={test.to} onChange={(e) => setTest({ ...test, to: e.target.value })} className={inputClass} />
            <textarea required rows={3} value={test.message} onChange={(e) => setTest({ ...test, message: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Send test</Button>
          </form>
        </Card>
      )}
    </ERPContentPage>
  )
}

export function AnalyticsPage() {
  const { toast } = useToast()
  const [overview, setOverview] = useState(null)
  const [util, setUtil] = useState(null)
  const [routes, setRoutes] = useState([])

  useEffect(() => {
    Promise.all([
      analyticsApi.overview().catch(() => null),
      analyticsApi.fleetUtilization(),
      analyticsApi.routeProfitability(),
    ])
      .then(([o, u, r]) => { setOverview(o); setUtil(u); setRoutes(r ?? []) })
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
  }, [toast])

  const cards = overview ? [
    ['Bookings', overview.totalBookings, `${overview.openBookings} open`],
    ['Trips in transit', overview.tripsInTransit, `${overview.tripsCompleted} completed`],
    ['Fleet util.', `${overview.utilizationPct}%`, `${overview.vehiclesOnTrip}/${overview.vehicles} on trip`],
    ['Revenue', formatCurrency(overview.revenue), `${overview.pendingInvoices} pending inv.`],
    ['Fuel cost', formatCurrency(overview.fuelCost), `${overview.fuelLiters} L`],
    ['Trips planned', overview.tripsPlanned, 'assigned/planned'],
  ] : util ? [
    ['Fleet util.', `${util.utilizationPct}%`, `${util.onTrip}/${util.total} on trip`],
  ] : []

  return (
    <ERPContentPage module="Operations" title="Analytics">
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([l, v, s]) => (
          <Card key={l} className="p-4"><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold">{v}</p><p className="text-xs text-slate-400">{s}</p></Card>
        ))}
      </div>
      <Card className="overflow-x-auto p-0">
        <p className="border-b px-4 py-2 text-sm font-medium">Completed route profitability</p>
        <table className="w-full text-sm">
          <thead><tr><th className="px-4 py-2 text-left">Origin</th><th className="px-4 py-2 text-left">Destination</th><th className="px-4 py-2 text-right">Distance km</th><th className="px-4 py-2 text-right">Toll</th></tr></thead>
          <tbody>{routes.map((r, i) => (
            <tr key={i} className="border-t"><td className="px-4 py-2">{r.origin}</td><td className="px-4 py-2">{r.destination}</td><td className="px-4 py-2 text-right">{r.distanceKm ?? '—'}</td><td className="px-4 py-2 text-right">{r.tollCost != null ? formatCurrency(r.tollCost) : '—'}</td></tr>
          ))}</tbody>
        </table>
        {routes.length === 0 && <p className="p-4 text-sm text-slate-500">No completed trips yet.</p>}
      </Card>
    </ERPContentPage>
  )
}

export function MarketplacePage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('listings')
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ listingType: 'LOAD', origin: '', destination: '', rate: '', capacityKg: '' })
  const [bidForm, setBidForm] = useState({ listingId: '', bidderName: '', amount: '' })

  const load = useCallback(async () => {
    try { setRows(await marketplaceApi.listings()) }
    catch (e) { toast({ title: 'Load failed', message: e.message, type: 'error' }) }
  }, [toast])

  useEffect(() => { load() }, [load])

  const create = async (ev) => {
    ev.preventDefault()
    try {
      await marketplaceApi.createListing({
        listingType: form.listingType,
        origin: form.origin,
        destination: form.destination,
        rate: form.rate ? Number(form.rate) : undefined,
        capacityKg: form.capacityKg ? Number(form.capacityKg) : undefined,
      })
      toast({ title: 'Listing created', type: 'success' })
      setForm({ listingType: 'LOAD', origin: '', destination: '', rate: '', capacityKg: '' })
      load()
    } catch (e) {
      toast({ title: 'Create failed', message: e.message, type: 'error' })
    }
  }

  const bid = async (ev) => {
    ev.preventDefault()
    try {
      await marketplaceApi.bid(bidForm.listingId, { bidderName: bidForm.bidderName, amount: Number(bidForm.amount) })
      toast({ title: 'Bid placed', type: 'success' })
      setBidForm({ listingId: '', bidderName: '', amount: '' })
      load()
    } catch (e) {
      toast({ title: 'Bid failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Marketplace">
      <TabBar tab={tab} setTab={setTab} tabs={[{ id: 'listings', label: 'Listings' }, { id: 'create', label: 'Create listing' }, { id: 'bid', label: 'Place bid' }]} />
      {tab === 'listings' && (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.length === 0 && <Card className="p-4 text-sm text-slate-500">No active listings. Create one.</Card>}
          {rows.map((l) => (
            <Card key={l.id} className="p-4">
              <p className="font-semibold">{l.listingType}: {l.origin} → {l.destination}</p>
              <p className="text-sm text-slate-500">Rate: {formatCurrency(l.rate ?? 0)} · Capacity: {l.capacityKg ?? '—'} kg · Bids: {l.bidCount ?? 0}</p>
              <Button type="button" variant="secondary" className="mt-2" onClick={() => { setBidForm({ listingId: l.id, bidderName: '', amount: '' }); setTab('bid') }}>Bid</Button>
            </Card>
          ))}
        </div>
      )}
      {tab === 'create' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={create} className="space-y-3">
            <Select label="Type" value={form.listingType} onChange={(e) => setForm({ ...form, listingType: e.target.value })} options={[{ value: 'LOAD', label: 'Load' }, { value: 'TRUCK', label: 'Truck' }]} />
            <input required placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className={inputClass} />
            <input required placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Rate" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Capacity kg" value={form.capacityKg} onChange={(e) => setForm({ ...form, capacityKg: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Publish listing</Button>
          </form>
        </Card>
      )}
      {tab === 'bid' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={bid} className="space-y-3">
            <Select label="Listing" value={bidForm.listingId} onChange={(e) => setBidForm({ ...bidForm, listingId: e.target.value })} options={[{ value: '', label: 'Select listing' }, ...rows.map((l) => ({ value: l.id, label: `${l.listingType} ${l.origin}→${l.destination}` }))]} />
            <input required placeholder="Bidder name" value={bidForm.bidderName} onChange={(e) => setBidForm({ ...bidForm, bidderName: e.target.value })} className={inputClass} />
            <input required type="number" placeholder="Bid amount" value={bidForm.amount} onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Place bid</Button>
          </form>
        </Card>
      )}
    </ERPContentPage>
  )
}

export function WarehousePage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('list')
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name: '', address: '', capacityCbm: '' })
  const [inv, setInv] = useState({ warehouseId: '', sku: '', description: '', quantity: '', weightKg: '' })

  const load = useCallback(async () => {
    try { setRows(await warehouseApi.list()) }
    catch (e) { toast({ title: 'Load failed', message: e.message, type: 'error' }) }
  }, [toast])

  useEffect(() => { load() }, [load])

  const create = async (ev) => {
    ev.preventDefault()
    try {
      await warehouseApi.create({ name: form.name, address: form.address || undefined, capacityCbm: form.capacityCbm ? Number(form.capacityCbm) : undefined })
      toast({ title: 'Warehouse created', type: 'success' })
      setForm({ name: '', address: '', capacityCbm: '' })
      load()
    } catch (e) {
      toast({ title: 'Create failed', message: e.message, type: 'error' })
    }
  }

  const addInv = async (ev) => {
    ev.preventDefault()
    try {
      await warehouseApi.addInventory(inv.warehouseId, {
        sku: inv.sku,
        description: inv.description || undefined,
        quantity: Number(inv.quantity || 0),
        weightKg: Number(inv.weightKg || 0),
      })
      toast({ title: 'Inventory added', type: 'success' })
      setInv((prev) => ({ warehouseId: prev.warehouseId, sku: '', description: '', quantity: '', weightKg: '' }))
      load()
    } catch (e) {
      toast({ title: 'Add failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Warehouse">
      <TabBar tab={tab} setTab={setTab} tabs={[{ id: 'list', label: 'Warehouses' }, { id: 'create', label: 'Add warehouse' }, { id: 'inventory', label: 'Add inventory' }]} />
      {tab === 'list' && (
        <div className="space-y-4">
          {rows.length === 0 && <Card className="p-4 text-sm text-slate-500">No warehouses yet.</Card>}
          {rows.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{w.name}</p>
                  <p className="text-sm text-slate-500">{w.address || 'No address'} · Cap {w.capacityCbm ?? '—'} CBM</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => { setInv({ warehouseId: w.id, sku: '', description: '', quantity: '', weightKg: '' }); setTab('inventory') }}>Add stock</Button>
              </div>
              <table className="w-full text-sm">
                <thead><tr><th className="py-1 text-left">SKU</th><th className="py-1 text-left">Description</th><th className="py-1 text-right">Qty</th><th className="py-1 text-right">Weight</th></tr></thead>
                <tbody>{(w.inventory ?? []).map((i) => (
                  <tr key={i.id} className="border-t"><td className="py-1">{i.sku}</td><td className="py-1">{i.description ?? '—'}</td><td className="py-1 text-right">{i.quantity}</td><td className="py-1 text-right">{i.weightKg}</td></tr>
                ))}</tbody>
              </table>
              {(w.inventory ?? []).length === 0 && <p className="text-sm text-slate-500">No inventory lines.</p>}
            </Card>
          ))}
        </div>
      )}
      {tab === 'create' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={create} className="space-y-3">
            <input required placeholder="Warehouse name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Capacity CBM" value={form.capacityCbm} onChange={(e) => setForm({ ...form, capacityCbm: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Create warehouse</Button>
          </form>
        </Card>
      )}
      {tab === 'inventory' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={addInv} className="space-y-3">
            <Select label="Warehouse" value={inv.warehouseId} onChange={(e) => setInv({ ...inv, warehouseId: e.target.value })} options={[{ value: '', label: 'Select warehouse' }, ...rows.map((w) => ({ value: w.id, label: w.name }))]} />
            <input required placeholder="SKU" value={inv.sku} onChange={(e) => setInv({ ...inv, sku: e.target.value })} className={inputClass} />
            <input placeholder="Description" value={inv.description} onChange={(e) => setInv({ ...inv, description: e.target.value })} className={inputClass} />
            <input required type="number" placeholder="Quantity" value={inv.quantity} onChange={(e) => setInv({ ...inv, quantity: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Weight kg" value={inv.weightKg} onChange={(e) => setInv({ ...inv, weightKg: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Add inventory</Button>
          </form>
        </Card>
      )}
    </ERPContentPage>
  )
}

export function IotPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('devices')
  const [rows, setRows] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({ deviceType: 'GPS', deviceSerial: '', vehicleId: '' })
  const [reading, setReading] = useState({ deviceId: '', metric: 'temperature', value: '', unit: 'C' })

  const load = useCallback(async () => {
    try {
      const [d, v] = await Promise.all([iotApi.devices(), vehiclesApi.list({ pageSize: 200 })])
      setRows(d ?? [])
      setVehicles(v.items ?? v ?? [])
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const register = async (ev) => {
    ev.preventDefault()
    try {
      await iotApi.register({
        deviceType: form.deviceType,
        deviceSerial: form.deviceSerial,
        vehicleId: form.vehicleId || undefined,
      })
      toast({ title: 'Device registered', type: 'success' })
      setForm({ deviceType: 'GPS', deviceSerial: '', vehicleId: '' })
      load()
    } catch (e) {
      toast({ title: 'Register failed', message: e.message, type: 'error' })
    }
  }

  const postReading = async (ev) => {
    ev.preventDefault()
    try {
      await iotApi.reading(reading.deviceId, {
        metric: reading.metric,
        value: Number(reading.value),
        unit: reading.unit || undefined,
      })
      toast({ title: 'Reading saved', type: 'success' })
      setReading((prev) => ({ deviceId: prev.deviceId, metric: 'temperature', value: '', unit: 'C' }))
      load()
    } catch (e) {
      toast({ title: 'Reading failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="IoT">
      <TabBar tab={tab} setTab={setTab} tabs={[{ id: 'devices', label: 'Devices' }, { id: 'register', label: 'Register' }, { id: 'reading', label: 'Post reading' }]} />
      {tab === 'devices' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr><th className="px-4 py-2 text-left">Serial</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-left">Last seen</th><th className="px-4 py-2 text-left" /></tr></thead>
            <tbody>{rows.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-2">{d.deviceSerial}</td>
                <td className="px-4 py-2">{d.deviceType}</td>
                <td className="px-4 py-2">{d.vehicle?.number ?? '—'}</td>
                <td className="px-4 py-2">{d.lastSeenAt ? String(d.lastSeenAt).slice(0, 19) : '—'}</td>
                <td className="px-4 py-2"><Button type="button" variant="secondary" onClick={() => { setReading({ deviceId: d.id, metric: 'temperature', value: '', unit: 'C' }); setTab('reading') }}>Reading</Button></td>
              </tr>
            ))}</tbody>
          </table>
          {rows.length === 0 && <p className="p-4 text-sm text-slate-500">No devices. Register one.</p>}
        </Card>
      )}
      {tab === 'register' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={register} className="space-y-3">
            <Select label="Type" value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })} options={[{ value: 'GPS', label: 'GPS' }, { value: 'TEMP', label: 'Temperature' }, { value: 'FUEL', label: 'Fuel sensor' }, { value: 'DOOR', label: 'Door' }]} />
            <input required placeholder="Device serial" value={form.deviceSerial} onChange={(e) => setForm({ ...form, deviceSerial: e.target.value })} className={inputClass} />
            <Select label="Vehicle (optional)" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} options={[{ value: '', label: 'Unassigned' }, ...vehicles.map((v) => ({ value: v.id, label: v.number || v.registrationNo }))]} />
            <Button type="submit" className="w-full">Register device</Button>
          </form>
        </Card>
      )}
      {tab === 'reading' && (
        <Card className="mx-auto max-w-lg p-6">
          <form onSubmit={postReading} className="space-y-3">
            <Select label="Device" value={reading.deviceId} onChange={(e) => setReading({ ...reading, deviceId: e.target.value })} options={[{ value: '', label: 'Select device' }, ...rows.map((d) => ({ value: d.id, label: `${d.deviceSerial} (${d.deviceType})` }))]} />
            <input required placeholder="Metric" value={reading.metric} onChange={(e) => setReading({ ...reading, metric: e.target.value })} className={inputClass} />
            <input required type="number" placeholder="Value" value={reading.value} onChange={(e) => setReading({ ...reading, value: e.target.value })} className={inputClass} />
            <input placeholder="Unit" value={reading.unit} onChange={(e) => setReading({ ...reading, unit: e.target.value })} className={inputClass} />
            <Button type="submit" className="w-full">Save reading</Button>
          </form>
        </Card>
      )}
    </ERPContentPage>
  )
}

export function AiPage() {
  const { toast } = useToast()
  const [message, setMessage] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [chat, setChat] = useState([])
  const [forecasts, setForecasts] = useState([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    aiApi.forecasts()
      .then(setForecasts)
      .catch((e) => toast({ title: 'Forecasts load failed', message: e.message, type: 'error' }))
  }, [toast])

  const send = async () => {
    if (!message.trim()) return
    const userMsg = message.trim()
    setMessage('')
    setChat((c) => [...c, { role: 'user', content: userMsg }])
    setSending(true)
    try {
      const r = await aiApi.chat(userMsg, sessionId)
      if (r.sessionId) setSessionId(r.sessionId)
      setChat((c) => [...c, { role: 'assistant', content: r.reply }])
    } catch (e) {
      toast({ title: 'Failed', message: e.message, type: 'error' })
    } finally {
      setSending(false)
    }
  }

  const ask = (text) => {
    setMessage(text)
  }

  return (
    <ERPContentPage module="Operations" title="AI Assistant">
      <p className="mb-3 text-sm text-slate-500">Live ops assistant answers from your company data (bookings, trips, fleet, fuel, invoices, LR workflow).</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {['help', 'How many open bookings?', 'Fleet status', 'Fuel summary', 'LR workflow'].map((q) => (
          <button key={q} type="button" onClick={() => ask(q)} className="rounded-full border px-3 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">{q}</button>
        ))}
      </div>
      <Card className="mb-4 space-y-3 p-4">
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {chat.length === 0 && <p className="text-sm text-slate-500">Ask a question to start.</p>}
          {chat.map((m, i) => (
            <div key={i} className={`rounded-lg p-3 text-sm ${m.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-slate-50 dark:bg-slate-800 mr-8'}`}>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">{m.role}</p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} rows={3} placeholder="Ask TMS assistant…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <Button onClick={send} disabled={sending}>{sending ? 'Thinking…' : 'Send'}</Button>
      </Card>
      <Card className="p-4">
        <p className="mb-2 font-medium">Forecasts</p>
        <ul className="space-y-1 text-sm">
          {forecasts.map((f) => (
            <li key={f.id || f.forecastType}>{f.forecastType}: {formatCurrency(f.predictedValue)} ({f.periodStart} – {f.periodEnd})</li>
          ))}
          {forecasts.length === 0 && <li className="text-slate-500">No forecasts yet.</li>}
        </ul>
      </Card>
    </ERPContentPage>
  )
}
