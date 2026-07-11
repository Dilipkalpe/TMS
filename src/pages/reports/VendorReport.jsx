import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function VendorReport() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.vendors(buildListParams({ page, pageSize, search })),
    [],
  )
  const columns = [
    { key: 'name', label: 'Vendor' },
    { key: 'category', label: 'Category' },
    { key: 'bills', label: 'Bills' },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Vendor Report"
      statusCards={registerStatusCards('Total Vendors', paged.total, 'orange', 'Building2')}
      showActions={false}
      searchPlaceholder="Vendor name..."
      searchKeys={['name', 'category']}
      columns={columns}
      data={paged.items}
      sortKey="name"
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      filterRow={<ReportFilterRow showVendor />}
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
