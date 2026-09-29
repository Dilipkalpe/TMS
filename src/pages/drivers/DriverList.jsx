import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { driversApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { withAuditColumns } from '../../utils/auditColumns'
import { formatCurrentLocation } from '../../utils/formatCurrentLocation'

function formatAge(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function trackingVariant(status) {
  if (status === 'Tracking Active') return 'success'
  if (status === 'Location Stale') return 'warning'
  return 'default'
}

export default function DriverList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      driversApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'status' })),
    [],
  )

  const columns = withAuditColumns([
    { key: 'id', label: 'Driver ID' },
    { key: 'name', label: 'Driver' },
    { key: 'phone', label: 'Mobile' },
    {
      key: 'driverAppStatus',
      label: 'App Access',
      render: (r) => (
        <Badge variant={r.portalEnabled ? 'success' : 'default'}>
          {r.driverAppStatus || (r.portalEnabled ? 'Enabled' : 'Disabled')}
        </Badge>
      ),
    },
    { key: 'currentVehicleNumber', label: 'Vehicle', render: (r) => r.currentVehicleNumber || '—' },
    { key: 'currentLocation', label: 'Current Location', render: (r) => formatCurrentLocation(r.currentLocation) },
    { key: 'locationUpdatedAt', label: 'Last Updated', render: (r) => formatAge(r.locationUpdatedAt) },
    {
      key: 'trackingStatus',
      label: 'Tracking',
      render: (r) => <Badge variant={trackingVariant(r.trackingStatus)}>{r.trackingStatus || 'Not Started'}</Badge>,
    },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'salary', label: 'Salary', render: (r) => formatCurrency(r.salary) },
  ])

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.drivers)}
      module="Drivers"
      title="Driver Master"
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
