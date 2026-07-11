import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { vehiclesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { importTemplates } from '../../config/importTemplates'

export default function VehicleList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      vehiclesApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'status' })),
    [],
  )

  const columns = [
    { key: 'number', label: 'Vehicle No.' },
    { key: 'type', label: 'Type' },
    { key: 'model', label: 'Model' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'trips', label: 'Trips' },
    { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.vehicles)}
      module="Vehicles"
      title="Vehicle Management"
      statusCards={[{ label: 'Total Fleet', color: 'blue', icon: 'Layers', count: paged.total }]}
      searchPlaceholder="Vehicle no., type, model..."
      filterOptions={['(All)', 'Active', 'Maintenance']}
      filterKey="status"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="number"
      onRowClick={(r) => navigate(`/vehicles/${r.id}`)}
      onEdit={(r) => navigate(`/vehicles/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete vehicle ${r.number}?`)) return
        try { await vehiclesApi.remove(r.id); toast({ title: 'Deleted', type: 'success' }); paged.refresh() }
        catch (err) { toast({ title: 'Delete failed', message: err.message, type: 'error' }) }
      }}
      exportFilename="vehicles-export.csv"
      importTemplate={importTemplates.vehicles}
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
