import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiItem } from '../../hooks/useApiResource'
import { maintenanceApi, vehiclesApi } from '../../services/api'
import { ArrowLeft, Pencil } from 'lucide-react'
import PrintButton from '../../components/print/PrintButton'

const RISK_VARIANT = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger' }

function VehicleMaintenanceTab({ vehicleId }) {
  const [profile, setProfile] = useState(null)
  useEffect(() => {
    maintenanceApi.vehicleProfile(vehicleId).then(setProfile).catch(() => setProfile(null))
  }, [vehicleId])

  if (!profile) return <p className="text-sm text-slate-500">Loading maintenance profile…</p>
  const { prediction, schedules, records, workOrders } = profile

  return (
    <div className="space-y-4">
      {prediction && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <span className="font-medium">Breakdown risk</span>
          <Badge variant={RISK_VARIANT[prediction.riskLevel] ?? 'default'}>{prediction.riskLevel}</Badge>
          <span className="text-sm text-slate-500">{prediction.riskScore}/100</span>
          {prediction.kmUntilNextService != null && (
            <span className="text-sm text-slate-500">~{prediction.kmUntilNextService} km to next service</span>
          )}
          <Link to="/maintenance" className="ml-auto text-sm text-primary hover:underline">Open maintenance →</Link>
        </div>
      )}
      {(prediction?.componentAlerts ?? []).length > 0 && (
        <ul className="space-y-1 text-sm">
          {prediction.componentAlerts.map((a, i) => (
            <li key={i} className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">{a.component}: {a.message}</li>
          ))}
        </ul>
      )}
      {schedules?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Active schedules</p>
          <ul className="text-sm text-slate-600">{schedules.map((s) => (
            <li key={s.id}>{s.serviceType} — next {s.nextDueAt ? String(s.nextDueAt).slice(0, 10) : '—'}</li>
          ))}</ul>
        </div>
      )}
      {workOrders?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Open work orders</p>
          <ul className="text-sm">{workOrders.map((w) => (
            <li key={w.id}>{w.title} ({w.status})</li>
          ))}</ul>
        </div>
      )}
      {records?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Recent service history</p>
          <ul className="text-sm text-slate-600">{records.slice(0, 5).map((r) => (
            <li key={r.id}>{String(r.performedAt).slice(0, 10)} — {r.description} ({formatCurrency(r.cost)})</li>
          ))}</ul>
        </div>
      )}
    </div>
  )
}

export default function VehicleDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { item: vehicle, loading, error } = useApiItem(vehiclesApi.get, id)

  if (loading) return <ERPContentPage module="Vehicles" title="Loading…"><p className="text-sm text-slate-500">Loading…</p></ERPContentPage>
  if (error || !vehicle) return <ERPContentPage module="Vehicles" title="Error"><p className="text-red-600">{error || 'Not found'}</p><Button className="mt-4" variant="outline" onClick={() => navigate('/vehicles')}>Back</Button></ERPContentPage>

  const compliance = [
    { label: 'Insurance Expiry', value: vehicle.insurance },
    { label: 'Fitness Expiry', value: vehicle.fitness },
    { label: 'Permit Expiry', value: vehicle.permit },
    { label: 'PUC Expiry', value: vehicle.puc },
    { label: 'Last Maintenance', value: vehicle.lastMaintenance },
  ]

  const printFields = [
    { label: 'Vehicle Number', value: vehicle.number },
    { label: 'Status', value: vehicle.status },
    { label: 'Type', value: vehicle.type },
    { label: 'Model', value: vehicle.model },
    { label: 'Capacity', value: vehicle.capacity },
    { label: 'Owner', value: vehicle.owner },
    { label: 'Total Trips', value: vehicle.trips },
    { label: 'Revenue', value: formatCurrency(vehicle.revenue) },
    ...compliance.map((f) => ({ label: f.label, value: f.value ?? '—' })),
  ]

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Vehicle Number', value: vehicle.number },
            { label: 'Type', value: vehicle.type },
            { label: 'Model', value: vehicle.model },
            { label: 'Capacity', value: vehicle.capacity },
            { label: 'Owner', value: vehicle.owner },
            { label: 'Total Trips', value: vehicle.trips },
            { label: 'Revenue', value: formatCurrency(vehicle.revenue) },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium uppercase text-slate-500">{f.label}</p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{f.value}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'compliance',
      label: 'Compliance',
      content: (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {compliance.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium uppercase text-slate-500">{f.label}</p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{f.value ?? '—'}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      content: <VehicleMaintenanceTab vehicleId={id} />,
    },
  ]

  return (
    <ERPContentPage
      module="Vehicles"
      title={vehicle.number}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/vehicles')}>Back</Button>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(vehicle.status)}>{vehicle.status}</Badge>
            <Button variant="outline" icon={Pencil} onClick={() => navigate(`/vehicles/${id}/edit`)}>Edit</Button>
            <PrintButton title="Vehicle Profile" subtitle={vehicle.number} fields={printFields} />
          </div>
        </div>
      }
    >
      <Card>
        <Tabs tabs={tabs} defaultTab="overview" />
      </Card>
    </ERPContentPage>
  )
}
