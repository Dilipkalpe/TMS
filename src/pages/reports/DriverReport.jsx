import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function DriverReport() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.drivers(buildListParams({ page, pageSize, search })),
    [],
  )
  const columns = [
    { key: 'name', label: 'Driver' },
    { key: 'phone', label: 'Phone' },
    { key: 'trips', label: 'Trips' },
    { key: 'rating', label: 'Rating', render: (r) => `⭐ ${r.rating}` },
    { key: 'salary', label: 'Salary', render: (r) => formatCurrency(r.salary) },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Driver Report"
      statusCards={registerStatusCards('Total Drivers', paged.total, 'violet', 'UserCircle')}
      showActions={false}
      searchPlaceholder="Driver name..."
      searchKeys={['name', 'phone']}
      columns={columns}
      data={paged.items}
      sortKey="name"
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      filterRow={<ReportFilterRow showDriver />}
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
