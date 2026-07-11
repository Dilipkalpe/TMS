import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function CustomerReport() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.customers(buildListParams({ page, pageSize, search })),
    [],
  )
  const columns = [
    { key: 'name', label: 'Customer' },
    { key: 'contact', label: 'Contact' },
    { key: 'trips', label: 'Trips' },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding) },
    { key: 'creditLimit', label: 'Credit Limit', render: (r) => formatCurrency(r.creditLimit) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Customer Report"
      statusCards={registerStatusCards('Total Customers', paged.total, 'green', 'Users')}
      showActions={false}
      searchPlaceholder="Customer name..."
      searchKeys={['name', 'contact']}
      columns={columns}
      data={paged.items}
      sortKey="name"
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      filterRow={<ReportFilterRow showCustomer />}
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
