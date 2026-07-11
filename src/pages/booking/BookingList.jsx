import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { bookingStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { bookingsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function BookingList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      bookingsApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'status' })),
    [],
  )

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

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete booking ${row.id}?`)) return
    try {
      await bookingsApi.remove(row.id)
      toast({ title: 'Deleted', message: `Booking ${row.id} removed.`, type: 'success' })
      paged.refresh()
    } catch (err) {
      toast({ title: 'Delete failed', message: err.message, type: 'error' })
    }
  }

  const statusCards = bookingStatusCards(paged.items).map((c) =>
    c.label === 'Pending' || c.label === 'Confirmed' || c.label === 'In Transit' || c.label === 'Delivered'
      ? { ...c, count: c.label === 'Pending' ? '—' : c.count }
      : c,
  )
  statusCards.push({ label: 'Total Records', color: 'blue', icon: 'Layers', count: paged.total })

  return (
    <ERPListPage
      module="Booking"
      title="Booking List"
      statusCards={statusCards.slice(-1)}
      onAdd={() => navigate(addRecordRoutes.bookings)}
      searchPlaceholder="Booking ID, customer..."
      searchKeys={['id', 'customer', 'from', 'to']}
      filterOptions={['(All)', 'Pending', 'Confirmed', 'In Transit', 'Delivered']}
      filterKey="status"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="date"
      onRowClick={(r) => navigate(`/bookings/${r.id}`)}
      onEdit={(r) => navigate(`/bookings/${r.id}/edit`)}
      onDelete={handleDelete}
      exportFilename="bookings-export.csv"
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
      onServerSearch={paged.setSearch}
      onServerFilter={paged.setFilter}
      searchValue={paged.search}
    />
  )
}
