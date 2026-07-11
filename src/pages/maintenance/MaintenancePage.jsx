import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Wrench, AlertTriangle, Calendar, Package, RefreshCw, TrendingUp,
  ShieldAlert, ClipboardList, Settings2,
} from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import VehicleLookupSelect from '../../components/ui/VehicleLookupSelect'
import LookupSelect from '../../components/ui/LookupSelect'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { maintenanceApi, vehiclesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const RISK_VARIANT = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger' }

const TABS = [
  ['overview', 'Overview'],
  ['analytics', 'Analytics'],
  ['schedules', 'Schedules'],
  ['records', 'Records'],
  ['work-orders', 'Work Orders'],
  ['parts', 'Spare Parts'],
  ['add-schedule', '+ Schedule'],
  ['add-record', '+ Service'],
]

export default function MaintenancePage() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [schedules, setSchedules] = useState([])
  const [records, setRecords] = useState([])
  const [parts, setParts] = useState([])
  const [alerts, setAlerts] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [workOrders, setWorkOrders] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  const [schedForm, setSchedForm] = useState({ vehicleId: '', serviceType: 'Engine Oil Change', intervalKm: '10000', intervalDays: '180' })
  const [recForm, setRecForm] = useState({ vehicleId: '', type: 'SCHEDULED', description: '', cost: '', odometer: '', vendor: '' })
  const [partForm, setPartForm] = useState({ sku: '', name: '', unitCost: '', stockQty: '0', minStock: '5' })
  const [woForm, setWoForm] = useState({ vehicleId: '', title: '', component: 'Engine', priority: 'NORMAL', assignedTo: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [o, p, s, r, pts, a, an, wo, vRes] = await Promise.all([
        maintenanceApi.overview(),
        maintenanceApi.predictions(),
        maintenanceApi.schedules(),
        maintenanceApi.records(),
        maintenanceApi.spareParts(),
        maintenanceApi.alerts(),
        maintenanceApi.analytics(),
        maintenanceApi.workOrders(),
        vehiclesApi.list({ pageSize: 200 }),
      ])
      setOverview(o)
      setPredictions(p)
      setSchedules(s)
      setRecords(r)
      setParts(pts)
      setAlerts(a)
      setAnalytics(an)
      setWorkOrders(wo)
      setVehicles(vRes.items ?? vRes ?? [])
    } catch (err) {
      toast({
        title: 'Failed to load maintenance data',
        message: err.status === 500
          ? 'Database tables missing — restart the API (it auto-creates them) or run: npm run maintenance:install'
          : err.message,
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const refreshVehicles = useCallback(async () => {
    const vRes = await vehiclesApi.list({ pageSize: 200 })
    const list = vRes.items ?? vRes ?? []
    setVehicles(list)
    return list
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && TABS.some(([id]) => id === t)) setTab(t)
  }, [searchParams])

  const submitSchedule = async (e) => {
    e.preventDefault()
    try {
      await maintenanceApi.addSchedule({
        vehicleId: schedForm.vehicleId,
        serviceType: schedForm.serviceType,
        intervalKm: Number(schedForm.intervalKm) || undefined,
        intervalDays: Number(schedForm.intervalDays) || undefined,
        lastServiceAt: new Date().toISOString(),
      })
      toast({ title: 'Service schedule created', type: 'success' })
      load()
      setTab('schedules')
    } catch (err) {
      toast({ title: 'Failed to create schedule', message: err.message, type: 'error' })
    }
  }

  const submitRecord = async (e) => {
    e.preventDefault()
    try {
      await maintenanceApi.addRecord({
        vehicleId: recForm.vehicleId,
        type: recForm.type,
        description: recForm.description,
        cost: Number(recForm.cost),
        odometer: recForm.odometer ? Number(recForm.odometer) : undefined,
        vendor: recForm.vendor || undefined,
      })
      toast({ title: 'Maintenance record saved', type: 'success' })
      load()
      setTab('records')
    } catch (err) {
      toast({ title: 'Failed to save record', message: err.message, type: 'error' })
    }
  }

  const submitPart = async (e) => {
    e.preventDefault()
    try {
      await maintenanceApi.addSparePart({
        sku: partForm.sku,
        name: partForm.name,
        unitCost: Number(partForm.unitCost),
        stockQty: Number(partForm.stockQty),
        minStock: Number(partForm.minStock),
      })
      toast({ title: 'Spare part saved', type: 'success' })
      setPartForm({ sku: '', name: '', unitCost: '', stockQty: '0', minStock: '5' })
      load()
      setTab('parts')
    } catch (err) {
      toast({ title: 'Failed to save part', message: err.message, type: 'error' })
    }
  }

  const submitWorkOrder = async (e) => {
    e.preventDefault()
    try {
      await maintenanceApi.addWorkOrder(woForm)
      toast({ title: 'Work order created', type: 'success' })
      setWoForm({ vehicleId: '', title: '', component: 'Engine', priority: 'NORMAL', assignedTo: '' })
      load()
      setTab('work-orders')
    } catch (err) {
      toast({ title: 'Failed to create work order', message: err.message, type: 'error' })
    }
  }

  const notifyVehicle = async (vehicleId) => {
    try {
      const r = await maintenanceApi.notifyVehicle(vehicleId)
      toast({ title: 'Alert sent', message: r.type, type: 'success' })
    } catch (err) {
      toast({ title: 'Notify failed', message: err.message, type: 'error' })
    }
  }

  const completeWorkOrder = async (id) => {
    try {
      await maintenanceApi.updateWorkOrderStatus(id, 'COMPLETED')
      toast({ title: 'Work order completed', type: 'success' })
      load()
    } catch (err) {
      toast({ title: 'Update failed', message: err.message, type: 'error' })
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'

  return (
    <ERPContentPage module="Fleet" title="Predictive Maintenance">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Service schedules, breakdown risk prediction, spare parts inventory & alerts
          </p>
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === t ? 'bg-primary text-white shadow-sm' : 'border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : overview && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Active Schedules', value: overview.activeSchedules, icon: Calendar, color: 'text-blue-600' },
                  { label: 'High Risk Vehicles', value: overview.highRiskVehicles, icon: ShieldAlert, color: 'text-red-500' },
                  { label: 'Open Work Orders', value: overview.openWorkOrders ?? 0, icon: ClipboardList, color: 'text-violet-600' },
                  { label: 'Cost (90 days)', value: formatCurrency(overview.cost90Days ?? overview.totalMaintenanceCost), icon: TrendingUp, color: 'text-green-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">{label}</p>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Top Risk Vehicles</h2>
                  {predictions.length === 0 ? (
                    <p className="text-sm text-slate-500">Add schedules and records to enable predictions.</p>
                  ) : (
                    <ul className="space-y-2">
                      {predictions.slice(0, 6).map((p) => (
                        <li key={p.vehicleId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                          <span className="font-medium">{p.registrationNo}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={RISK_VARIANT[p.riskLevel] ?? 'default'}>{p.riskLevel}</Badge>
                            <span className="text-sm text-slate-500">{p.riskScore}/100</span>
                            {(p.riskLevel === 'HIGH' || p.riskLevel === 'MEDIUM') && (
                              <button type="button" onClick={() => notifyVehicle(p.vehicleId)} className="text-xs text-primary hover:underline">Alert</button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card className="p-5">
                  <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Component Alerts (Engine · Tyre · Brake)</h2>
                  <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
                    {(alerts?.componentAlerts ?? []).slice(0, 10).map((a, i) => (
                      <li key={i} className={`rounded-lg px-3 py-2 ${a.severity === 'HIGH' ? 'bg-red-50 text-red-800 dark:bg-red-950/30' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/30'}`}>
                        <strong>{a.registrationNo}</strong> · {a.component}: {a.message}
                      </li>
                    ))}
                    {(alerts?.complianceAlerts ?? []).slice(0, 4).map((c) => (
                      <li key={c.vehicleId} className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
                        {c.registrationNo}: {c.alerts?.join('; ')}
                      </li>
                    ))}
                    {!alerts?.componentAlerts?.length && !alerts?.complianceAlerts?.length && (
                      <li className="text-slate-500">No component or compliance alerts</li>
                    )}
                  </ul>
                </Card>
              </div>

              {overview.riskDistribution?.length > 0 && (
                <Card className="p-5">
                  <h2 className="mb-3 font-semibold">Fleet risk distribution</h2>
                  <div className="flex h-8 overflow-hidden rounded-lg">
                    {overview.riskDistribution.map((b) => (
                      <div
                        key={b.level}
                        title={`${b.level}: ${b.count}`}
                        className={`${b.level === 'HIGH' ? 'bg-red-500' : b.level === 'MEDIUM' ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ width: `${Math.max(5, (b.count / Math.max(predictions.length, 1)) * 100)}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-slate-500">
                    {overview.riskDistribution.map((b) => (
                      <span key={b.level}>{b.level}: {b.count}</span>
                    ))}
                  </div>
                </Card>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Due & Overdue Services
                  </h2>
                  <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
                    {(alerts?.maintenanceAlerts ?? []).slice(0, 8).map((a, i) => (
                      <li
                        key={i}
                        className={`rounded-lg px-3 py-2 ${a.overdue ? 'bg-red-50 text-red-800 dark:bg-red-950/30' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/30'}`}
                      >
                        {a.registrationNo} — {a.serviceType}{' '}
                        {a.overdue ? '(Overdue)' : a.nextDueAt ? `due ${String(a.nextDueAt).slice(0, 10)}` : ''}
                      </li>
                    ))}
                    {(alerts?.lowStockParts ?? []).map((p) => (
                      <li key={p.id} className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
                        Low stock: {p.name} ({p.stockQty}/{p.minStock})
                      </li>
                    ))}
                    {!alerts?.maintenanceAlerts?.length && !alerts?.lowStockParts?.length && (
                      <li className="text-slate-500">No active alerts</li>
                    )}
                  </ul>
                </Card>

                <Card className="p-5">
                  <h2 className="mb-4 font-semibold">Quick work order</h2>
                  <form onSubmit={submitWorkOrder} className="space-y-2">
                    <VehicleLookupSelect
                      vehicles={vehicles}
                      vehicleId={woForm.vehicleId}
                      onVehicleIdChange={(id) => setWoForm({ ...woForm, vehicleId: id })}
                      onVehiclesRefresh={refreshVehicles}
                    />
                    <input required placeholder="Title" value={woForm.title} onChange={(e) => setWoForm({ ...woForm, title: e.target.value })} className={inputClass} />
                    <select value={woForm.component} onChange={(e) => setWoForm({ ...woForm, component: e.target.value })} className={inputClass}>
                      {['Engine', 'Tyre', 'Brake', 'Transmission', 'Electrical', 'General'].map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <Button type="submit" size="sm">Create work order</Button>
                  </form>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-700">Fleet Risk Matrix</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-2 text-left">Vehicle</th>
                        <th className="px-4 py-2 text-left">Risk</th>
                        <th className="px-4 py-2 text-left">Score</th>
                        <th className="px-4 py-2 text-left">Factors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((p) => (
                        <tr key={p.vehicleId} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-2 font-medium">{p.registrationNo}</td>
                          <td className="px-4 py-2">
                            <Badge variant={RISK_VARIANT[p.riskLevel] ?? 'default'}>{p.riskLevel}</Badge>
                          </td>
                          <td className="px-4 py-2">{p.riskScore}</td>
                          <td className="px-4 py-2 text-slate-500">
                            {[...(p.factors ?? []), ...(p.componentAlerts ?? []).map((a) => a.message)].slice(0, 3).join(' · ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )
        )}

        {tab === 'analytics' && analytics && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-4"><p className="text-sm text-slate-500">90-day cost</p><p className="text-xl font-bold">{formatCurrency(analytics.totalCost90Days)}</p></Card>
              {(analytics.componentSummary ?? []).map((c) => (
                <Card key={c.component} className="p-4">
                  <p className="text-sm text-slate-500">{c.component} alerts</p>
                  <p className="text-xl font-bold">{c.alertCount} <span className="text-sm font-normal text-red-600">({c.highSeverity} high)</span></p>
                </Card>
              ))}
            </div>
            <Card className="p-5">
              <h2 className="mb-4 font-semibold">Maintenance cost by month</h2>
              <div className="flex items-end gap-2 h-40">
                {(analytics.costByMonth ?? []).map((m) => {
                  const max = Math.max(...analytics.costByMonth.map((x) => x.cost), 1)
                  return (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-primary/80" style={{ height: `${(m.cost / max) * 100}%`, minHeight: m.cost > 0 ? 4 : 0 }} title={formatCurrency(m.cost)} />
                      <span className="text-[10px] text-slate-500">{m.month.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === 'work-orders' && (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Component</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((w) => (
                  <tr key={w.id} className="border-t">
                    <td className="px-4 py-3">{w.registrationNo}</td>
                    <td className="px-4 py-3">{w.title}</td>
                    <td className="px-4 py-3">{w.component ?? '—'}</td>
                    <td className="px-4 py-3">{w.priority}</td>
                    <td className="px-4 py-3">{w.status}</td>
                    <td className="px-4 py-3 text-right">
                      {w.status !== 'COMPLETED' && (
                        <button type="button" onClick={() => completeWorkOrder(w.id)} className="text-primary hover:underline">Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!workOrders.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No work orders</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}

        {tab === 'schedules' && (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Vehicle</th>
                    <th className="px-4 py-3 text-left">Service</th>
                    <th className="px-4 py-3 text-left">Component</th>
                    <th className="px-4 py-3 text-right">Interval km</th>
                    <th className="px-4 py-3 text-right">Interval days</th>
                    <th className="px-4 py-3 text-left">Next Due</th>
                    <th className="px-4 py-3 text-left">Odometer</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 font-medium">{s.vehicle?.registrationNo}</td>
                      <td className="px-4 py-3">{s.serviceType}</td>
                      <td className="px-4 py-3">{s.component ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{s.intervalKm ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{s.intervalDays ?? '—'}</td>
                      <td className="px-4 py-3">{s.nextDueAt ? String(s.nextDueAt).slice(0, 10) : '—'}</td>
                      <td className="px-4 py-3">{s.vehicle?.currentOdometer ?? 0} km</td>
                    </tr>
                  ))}
                  {!schedules.length && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No schedules yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === 'records' && (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Vehicle</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3">{String(r.performedAt).slice(0, 10)}</td>
                      <td className="px-4 py-3">{r.vehicle?.registrationNo}</td>
                      <td className="px-4 py-3">{r.type}</td>
                      <td className="px-4 py-3">{r.description}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(r.cost)}</td>
                    </tr>
                  ))}
                  {!records.length && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No records yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === 'parts' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold"><Package className="h-4 w-4" /> Add Spare Part</h2>
              <form onSubmit={submitPart} className="space-y-3">
                <input required placeholder="SKU" value={partForm.sku} onChange={(e) => setPartForm({ ...partForm, sku: e.target.value })} className={inputClass} />
                <input required placeholder="Part name" value={partForm.name} onChange={(e) => setPartForm({ ...partForm, name: e.target.value })} className={inputClass} />
                <div className="grid grid-cols-3 gap-2">
                  <input required type="number" placeholder="Unit cost" value={partForm.unitCost} onChange={(e) => setPartForm({ ...partForm, unitCost: e.target.value })} className={inputClass} />
                  <input type="number" placeholder="Stock" value={partForm.stockQty} onChange={(e) => setPartForm({ ...partForm, stockQty: e.target.value })} className={inputClass} />
                  <input type="number" placeholder="Min" value={partForm.minStock} onChange={(e) => setPartForm({ ...partForm, minStock: e.target.value })} className={inputClass} />
                </div>
                <Button type="submit">Save Part</Button>
              </form>
            </Card>
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-700">Inventory</div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {parts.map((p) => (
                  <li key={p.id} className={`flex justify-between px-4 py-3 text-sm ${p.stockQty <= p.minStock ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                    <span><strong>{p.sku}</strong> — {p.name}</span>
                    <span>{p.stockQty} in stock · {formatCurrency(p.unitCost)}</span>
                  </li>
                ))}
                {!parts.length && <li className="px-4 py-8 text-center text-slate-500">No spare parts</li>}
              </ul>
            </Card>
          </div>
        )}

        {tab === 'add-schedule' && (
          <Card className="mx-auto max-w-lg p-6">
            <form onSubmit={submitSchedule} className="space-y-4">
              <h2 className="flex items-center gap-2 font-semibold"><Settings2 className="h-4 w-4" /> New Service Schedule</h2>
              <VehicleLookupSelect
                vehicles={vehicles}
                vehicleId={schedForm.vehicleId}
                onVehicleIdChange={(id) => setSchedForm({ ...schedForm, vehicleId: id })}
                onVehiclesRefresh={refreshVehicles}
              />
              <input required value={schedForm.serviceType} onChange={(e) => setSchedForm({ ...schedForm, serviceType: e.target.value })} className={inputClass} placeholder="Service type" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={schedForm.intervalKm} onChange={(e) => setSchedForm({ ...schedForm, intervalKm: e.target.value })} className={inputClass} placeholder="Interval km" />
                <input type="number" value={schedForm.intervalDays} onChange={(e) => setSchedForm({ ...schedForm, intervalDays: e.target.value })} className={inputClass} placeholder="Interval days" />
              </div>
              <Button type="submit" className="w-full">Create Schedule</Button>
            </form>
          </Card>
        )}

        {tab === 'add-record' && (
          <Card className="mx-auto max-w-lg p-6">
            <form onSubmit={submitRecord} className="space-y-4">
              <h2 className="flex items-center gap-2 font-semibold"><ClipboardList className="h-4 w-4" /> Log Service / Repair</h2>
              <VehicleLookupSelect
                vehicles={vehicles}
                vehicleId={recForm.vehicleId}
                onVehicleIdChange={(id) => setRecForm({ ...recForm, vehicleId: id })}
                onVehiclesRefresh={refreshVehicles}
              />
              <select value={recForm.type} onChange={(e) => setRecForm({ ...recForm, type: e.target.value })} className={inputClass}>
                <option value="SCHEDULED">Scheduled Service</option>
                <option value="BREAKDOWN">Breakdown</option>
                <option value="INSPECTION">Inspection</option>
                <option value="REPAIR">Repair</option>
              </select>
              <input required value={recForm.description} onChange={(e) => setRecForm({ ...recForm, description: e.target.value })} className={inputClass} placeholder="Description" />
              <LookupSelect
                label="Vendor (optional)"
                type="vendors"
                value={recForm.vendor}
                onChange={(v) => setRecForm({ ...recForm, vendor: v })}
                placeholder="Search vendor…"
              />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" value={recForm.cost} onChange={(e) => setRecForm({ ...recForm, cost: e.target.value })} className={inputClass} placeholder="Cost ₹" />
                <input type="number" value={recForm.odometer} onChange={(e) => setRecForm({ ...recForm, odometer: e.target.value })} className={inputClass} placeholder="Odometer km" />
              </div>
              <Button type="submit" className="w-full">Save Record</Button>
            </form>
          </Card>
        )}
      </div>
    </ERPContentPage>
  )
}
