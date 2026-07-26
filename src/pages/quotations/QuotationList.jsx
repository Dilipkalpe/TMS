import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { quotationsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

function statusVariant(status) {
  if (status === 'Accepted') return 'success'
  if (status === 'Rejected') return 'danger'
  if (status === 'Sent') return 'info'
  return 'default'
}

export default function QuotationList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => quotationsApi.list(buildListParams({ page, pageSize, search })),
    [],
  )

  const columns = [
    { key: 'quoteNo', label: 'Quote No' },
    { key: 'customerName', label: 'Customer' },
    { key: 'fromCity', label: 'From' },
    { key: 'toCity', label: 'To' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'bookingId', label: 'Booking' },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.quotations)}
      module="Quotations"
      title="Quotation List"
      statusCards={[{ label: 'Total Quotations', color: 'blue', icon: 'FileText', count: paged.total }]}
      searchPlaceholder="Quote no, customer, route..."
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="quoteNo"
      onRowClick={(r) => navigate(`/quotations/${r.id}`)}
      onEdit={(r) => navigate(`/quotations/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete quotation ${r.quoteNo}?`)) return
        try {
          await quotationsApi.remove(r.id)
          toast({ title: 'Deleted', type: 'success' })
          paged.refresh()
        } catch (err) {
          toast({ title: 'Delete failed', message: err.message, type: 'error' })
        }
      }}
      exportFilename="quotations-export.csv"
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
      onServerSearch={paged.setSearch}
      searchValue={paged.search}
    />
  )
}
