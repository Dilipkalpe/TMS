import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { freightInvoicesApi } from '../../services/api'

function statusVariant(status) {
  if (status === 'Paid') return 'success'
  if (status === 'Partial') return 'warning'
  if (status === 'Cancelled') return 'danger'
  return 'info'
}

export default function FreightInvoiceList() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => freightInvoicesApi.list(buildListParams({ page, pageSize, search })),
    [],
  )

  const columns = [
    { key: 'invoiceNo', label: 'Invoice No' },
    { key: 'bookingId', label: 'Booking' },
    { key: 'customerName', label: 'Customer' },
    { key: 'billType', label: 'Type' },
    { key: 'invoiceDate', label: 'Date' },
    { key: 'totalAmount', label: 'Total', render: (r) => formatCurrency(r.totalAmount) },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  return (
    <ERPListPage
      module="Accounting"
      title="Freight Invoices"
      statusCards={[{ label: 'Invoices', color: 'blue', icon: 'FileText', count: paged.total }]}
      searchPlaceholder="Invoice no, booking, customer..."
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      showAdd={false}
      sortKey="invoiceNo"
      onRowClick={(r) => navigate(`/accounting/freight-invoices/${r.id}`)}
      exportFilename="freight-invoices-export.csv"
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
