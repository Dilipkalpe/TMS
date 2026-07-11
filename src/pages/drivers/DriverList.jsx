import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { driversApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function DriverList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      driversApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'status' })),
    [],
  )

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'license', label: 'License No.' },
    { key: 'phone', label: 'Contact' },
    { key: 'salary', label: 'Salary', render: (r) => formatCurrency(r.salary) },
    { key: 'advance', label: 'Advance', render: (r) => formatCurrency(r.advance) },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'trips', label: 'Trips' },
    { key: 'rating', label: 'Rating', render: (r) => `⭐ ${r.rating}` },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.drivers)}
      module="Drivers"
      title="Driver Management"
      statusCards={[{ label: 'Total Drivers', color: 'blue', icon: 'Users', count: paged.total }]}
      searchPlaceholder="Name, license, phone..."
      filterOptions={['(All)', 'Active', 'On Leave']}
      filterKey="status"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="name"
      onRowClick={(r) => navigate(`/drivers/${r.id}`)}
      onEdit={(r) => navigate(`/drivers/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete driver ${r.name}?`)) return
        try { await driversApi.remove(r.id); toast({ title: 'Deleted', type: 'success' }); paged.refresh() }
        catch (err) { toast({ title: 'Delete failed', message: err.message, type: 'error' }) }
      }}
      exportFilename="drivers-export.csv"
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
