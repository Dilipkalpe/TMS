import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { drivers } from '../../data/drivers'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { ArrowLeft } from 'lucide-react'

export default function DriverDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const driver = drivers.find((d) => d.id === id) || drivers[0]

  return (
    <ERPContentPage
      module="Drivers"
      title={driver.name}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/drivers')}>Back</Button>
          <Badge variant={statusVariant(driver.status)}>{driver.status}</Badge>
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
