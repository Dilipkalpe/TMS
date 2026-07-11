import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiItem } from '../../hooks/useApiResource'
import { driversApi } from '../../services/api'
import { ArrowLeft } from 'lucide-react'
import PrintButton from '../../components/print/PrintButton'

export default function DriverDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { item: driver, loading, error } = useApiItem(driversApi.get, id, [id])

  if (loading) {
    return (
      <ERPContentPage module="Drivers" title="Driver Details">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  if (error || !driver) {
    return (
      <ERPContentPage module="Drivers" title="Driver Details">
        <p className="text-sm text-red-500">{error || 'Driver not found'}</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/drivers')}>Back</Button>
      </ERPContentPage>
    )
  }

  const printFields = [
    { label: 'Driver Name', value: driver.name },
    { label: 'Status', value: driver.status },
    { label: 'Phone', value: driver.phone },
    { label: 'Email', value: driver.email },
    { label: 'Address', value: driver.address },
    { label: 'License Expiry', value: driver.licenseExpiry },
    { label: 'Monthly Salary', value: formatCurrency(driver.salary) },
    { label: 'Advance Balance', value: formatCurrency(driver.advance) },
    { label: 'Total Trips', value: driver.trips },
    { label: 'Rating', value: driver.rating },
  ]

  return (
    <ERPContentPage
      module="Drivers"
      title={driver.name}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/drivers')}>Back</Button>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(driver.status)}>{driver.status}</Badge>
            <PrintButton title="Driver Profile" subtitle={driver.name} fields={printFields} />
          </div>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contact Details" />
          <div className="space-y-3">
            {[
              { label: 'Phone', value: driver.phone },
              { label: 'Email', value: driver.email },
              { label: 'Address', value: driver.address },
              { label: 'License Expiry', value: driver.licenseExpiry },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-slate-500">{f.label}</p>
                <p className="font-medium">{f.value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Salary & Advance" />
          <div className="space-y-3">
            {[
              { label: 'Monthly Salary', value: formatCurrency(driver.salary) },
              { label: 'Advance Balance', value: formatCurrency(driver.advance) },
              { label: 'Total Trips', value: driver.trips },
              { label: 'Rating', value: `⭐ ${driver.rating}` },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs text-slate-500">{f.label}</p>
                <p className="font-medium">{f.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ERPContentPage>
  )
}
