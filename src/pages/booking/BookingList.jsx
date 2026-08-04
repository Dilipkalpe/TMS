import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { bookingStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { bookingsApi } from '../../services/api'
import { bookingPath } from '../../utils/docPath'
import { useToast } from '../../context/ToastContext'
import { withAuditColumns } from '../../utils/auditColumns'
import { ArrowRight } from 'lucide-react'
import Button from '../../components/ui/Button'

export default function BookingList({ embedded = false, defaultStatus = '(All)' }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      bookingsApi.list(buildListParams({
        page, pageSize, search,
        filter: filter && filter !== '(All)' ? filter : (defaultStatus !== '(All)' ? defaultStatus : filter),
        filterKey: 'status',
      })),
    [defaultStatus],
  )

  const columns = withAuditColumns([
    {
      key: 'action',
      label: 'Next Action',
      render: (r) => (
        <Button size="sm" icon={ArrowRight} onClick={(e) => { e.stopPropagation(); navigate(bookingPath(r.id)) }}>
          Open
        </Button>
      ),
    },
    { key: 'id', label: 'Booking ID' },
    { key: 'date', label: 'Date' },
    { key: 'branchName', label: 'Branch', render: (r) => r.branchName || '—' },
    { key: 'customer', label: 'Customer' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'lrNumber', label: 'LR', render: (r) => r.lrNumber || '—' },
    { key: 'status', label: 'Status', width: 'w-28', nowrap: true, render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'payment', label: 'Payment', width: 'w-28', nowrap: true, render: (r) => <Badge variant={statusVariant(r.payment)}>{r.payment}</Badge> },
  ])

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
      module={embedded ? 'Booking Management' : 'Booking'}
      title={embedded ? undefined : 'Booking List'}
      statusCards={embedded ? [] : statusCards.slice(-1)}
      onAdd={embedded ? undefined : () => navigate(addRecordRoutes.bookings)}
      showAdd={!embedded}
      searchPlaceholder="Booking ID, customer..."
      searchKeys={['id', 'customer', 'from', 'to']}
      filterOptions={embedded && defaultStatus !== '(All)'
        ? [defaultStatus]
        : ['(All)', 'Pending', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled']}
      filterKey="status"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="date"
      onRowClick={(r) => navigate(bookingPath(r.id))}
      onEdit={(r) => navigate(bookingPath(r.id, 'edit'))}
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
