import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function VehicleReport() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.vehicles(buildListParams({ page, pageSize, search })),
    [],
  )
  const rows = paged.items.map((v) => ({
    ...v,
    utilization: Math.round((v.trips / 150) * 100),
  }))

  const columns = [
    { key: 'number', label: 'Vehicle' },
    { key: 'type', label: 'Type' },
    { key: 'trips', label: 'Trips' },
    { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
    { key: 'utilization', label: 'Utilization', render: (r) => `${r.utilization}%` },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Vehicle Report"
      statusCards={registerStatusCards('Total Vehicles', paged.total, 'blue', 'Truck')}
      showActions={false}
      searchPlaceholder="Vehicle no., type..."
      searchKeys={['number', 'type']}
      columns={columns}
      data={rows}
      sortKey="number"
      defaultSortDir="asc"
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      filterRow={<ReportFilterRow />}
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
