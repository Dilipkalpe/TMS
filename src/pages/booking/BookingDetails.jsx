import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiItem } from '../../hooks/useApiResource'
import { bookingsApi } from '../../services/api'
import BookingFinancePanel from '../../components/booking/BookingFinancePanel'
import { ArrowLeft, FileText, Pencil } from 'lucide-react'
import PrintButton from '../../components/print/PrintButton'

export default function BookingDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { item: booking, loading, error, setItem } = useApiItem(bookingsApi.get, id)

  if (loading) {
    return (
      <ERPContentPage module="Booking" title="Loading…">
        <p className="text-sm text-slate-500">Loading booking details…</p>
      </ERPContentPage>
    )
  }

  if (error || !booking) {
    return (
      <ERPContentPage module="Booking" title="Not found">
        <p className="text-sm text-red-600">{error || 'Booking not found.'}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/bookings')}>Back to list</Button>
      </ERPContentPage>
    )
  }

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
            <Button variant="outline" icon={Pencil} onClick={() => navigate(`/bookings/${booking.id}/edit`)}>Edit</Button>
            <Button variant="outline" icon={FileText} onClick={() => navigate(`/lr/generate?bookingId=${encodeURIComponent(booking.id)}`)}>Generate LR</Button>
            <PrintButton
              title="Booking Confirmation"
              subtitle={`Booking ${booking.id}`}
              badges={[`Status: ${booking.status}`, `Payment: ${booking.payment}`]}
              fields={fields}
            />
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
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{f.value ?? '—'}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4">
        <BookingFinancePanel bookingId={booking.id} booking={booking} onBookingChange={setItem} />
      </div>
    </ERPContentPage>
  )
}
