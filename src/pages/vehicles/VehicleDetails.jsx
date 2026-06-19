import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Tabs from '../../components/ui/Tabs'
import { vehicles, maintenanceRecords } from '../../data/vehicles'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { ArrowLeft } from 'lucide-react'

export default function VehicleDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vehicle = vehicles.find((v) => v.id === id) || vehicles[0]

  const compliance = [
    { label: 'Insurance Expiry', value: vehicle.insurance },
    { label: 'Fitness Expiry', value: vehicle.fitness },
    { label: 'Permit Expiry', value: vehicle.permit },
    { label: 'PUC Expiry', value: vehicle.puc },
    { label: 'Last Maintenance', value: vehicle.lastMaintenance },
  ]

  const maintColumns = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'cost', label: 'Cost', render: (r) => formatCurrency(r.cost) },
    { key: 'vendor', label: 'Vendor' },
    { key: 'remarks', label: 'Remarks' },
  ]

  const filteredMaint = maintenanceRecords.filter((m) => m.vehicle === vehicle.number)

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
              <p className="mt-1 font-medium">{f.value}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'compliance',
      label: 'Compliance',
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {compliance.map((c) => (
            <div key={c.label} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="mt-1 font-semibold">{c.value}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      content: (
        <ERPDataTable
          fill
          columns={maintColumns}
          data={filteredMaint.length ? filteredMaint : maintenanceRecords}
          showActions={false}
        />
      ),
    },
  ]

  return (
    <ERPContentPage
      module="Vehicles"
      title={vehicle.number}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/vehicles')}>Back</Button>
          <Badge variant={statusVariant(vehicle.status)}>{vehicle.status}</Badge>
        </div>
      }
    >
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden !p-2.5 sm:!p-3">
        <Tabs fill tabs={tabs} />
      </Card>
    </ERPContentPage>
  )
}
