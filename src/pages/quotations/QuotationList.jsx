import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { quotationsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { withAuditColumns } from '../../utils/auditColumns'

function statusVariant(status) {
  if (status === 'Accepted') return 'success'
  if (status === 'Rejected') return 'danger'
  if (status === 'Sent') return 'info'
  return 'default'
}

export default function QuotationList({ embedded = false }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => quotationsApi.list(buildListParams({ page, pageSize, search })),
    [],
  )

  const columns = withAuditColumns([
    {
      key: 'action',
      label: 'Next Action',
      render: (r) => (
        <button
          type="button"
          className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
          onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${r.id}`) }}
        >
          Open
        </button>
      ),
    },
    { key: 'quoteNo', label: 'Quote No' },
    { key: 'branchName', label: 'Branch', render: (r) => r.branchName || '—' },
    { key: 'customerName', label: 'Customer' },
    { key: 'fromCity', label: 'From' },
    { key: 'toCity', label: 'To' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'bookingId', label: 'Booking' },
  ])

  return (
    <ERPListPage
      onAdd={embedded ? undefined : () => navigate(addRecordRoutes.quotations)}
      showAdd={!embedded}
      module={embedded ? 'Booking Management' : 'Quotations'}
      title={embedded ? undefined : 'Quotation List'}
      statusCards={embedded ? [] : [{ label: 'Total Quotations', color: 'blue', icon: 'FileText', count: paged.total }]}
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
        if (r.bookingId) {
          toast({
            title: 'Cannot delete',
            message: `Quotation ${r.quoteNo} is linked to booking ${r.bookingId}.`,
            type: 'warning',
          })
          return
        }
        if (!window.confirm(`Delete quotation ${r.quoteNo}?`)) return
        try {
          await quotationsApi.remove(r.id)
          toast({ title: 'Deleted', message: r.quoteNo, type: 'success' })
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
