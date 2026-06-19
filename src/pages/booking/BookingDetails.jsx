import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { bookings } from '../../data/bookings'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { ArrowLeft, FileText, Printer } from 'lucide-react'

export default function BookingDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const booking = bookings.find((b) => b.id === id) || bookings[0]

  const fields = [
    { label: 'Booking ID', value: booking.id },
    { label: 'Date', value: booking.date },
    { label: 'Customer', value: booking.customer },
    { label: 'Consignor', value: booking.consignor },
    { label: 'Consignee', value: booking.consignee },
    { label: 'Route', value: `${booking.from} → ${booking.to}` },
    { label: 'Material', value: booking.material },
    { label: 'Quantity', value: booking.quantity },
    { label: 'Vehicle', value: booking.vehicle },
    { label: 'Driver', value: booking.driver },
    { label: 'Freight', value: formatCurrency(booking.freight) },
    { label: 'Advance', value: formatCurrency(booking.advance) },
    { label: 'Balance', value: formatCurrency(booking.balance) },
  ]

  return (
    <ERPContentPage
      module="Booking"
      title={`Booking ${booking.id}`}
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/bookings')}>Back</Button>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
            <Badge variant={statusVariant(booking.payment)}>Payment: {booking.payment}</Badge>
            <Button variant="outline" icon={FileText} onClick={() => navigate('/lr/generate')}>Generate LR</Button>
            <Button icon={Printer}>Print</Button>
          </div>
        </div>
      }
    >
      <Card>
        <CardHeader title="Booking Information" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium uppercase text-slate-500">{f.label}</p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{f.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </ERPContentPage>
  )
}
