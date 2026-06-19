import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { bookings } from '../../data/bookings'
import { bookingStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function BookingList() {
  const navigate = useNavigate()

  const columns = [
    { key: 'id', label: 'Booking ID' },
    { key: 'date', label: 'Date' },
    { key: 'customer', label: 'Customer' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'payment', label: 'Payment', render: (r) => <Badge variant={statusVariant(r.payment)}>{r.payment}</Badge> },
  ]

  return (
    <ERPListPage
      module="Booking"
      title="Booking List"
      statusCards={bookingStatusCards(bookings)}
      
      onAdd={() => navigate(addRecordRoutes.bookings)}
      searchPlaceholder="Booking ID, customer..."
      searchKeys={['id', 'customer', 'from', 'to']}
      filterOptions={['(All)', 'Pending', 'Confirmed', 'In Transit', 'Delivered']}
      filterKey="status"
      columns={columns}
      data={bookings}
      sortKey="date"
      onRowClick={(r) => navigate(`/bookings/${r.id}`)}
      onEdit={(r) => navigate(`/bookings/${r.id}`)}
    />
  )
}
