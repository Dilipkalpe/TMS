import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { itemsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { withAuditColumns } from '../../utils/auditColumns'

export default function ItemList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      itemsApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'status' })),
    [],
  )

  const columns = withAuditColumns([
    { key: 'name', label: 'Item Name' },
    { key: 'hsn', label: 'HSN', render: (r) => r.hsn || '—' },
    { key: 'defaultPackageType', label: 'Pkg Type', render: (r) => r.defaultPackageType || '—' },
    { key: 'unit', label: 'Unit', render: (r) => r.unit || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ])

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.items)}
      module="Items"
      title="Item Master"
      statusCards={[{ label: 'Total Items', color: 'blue', icon: 'Package', count: paged.total }]}
      searchPlaceholder="Item name, HSN…"
      filterOptions={['(All)', 'Active', 'Inactive']}
      filterKey="status"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="name"
      onRowClick={(r) => navigate(`/items/${r.id}`)}
      onEdit={(r) => navigate(`/items/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete item ${r.name}?`)) return
        try { await itemsApi.remove(r.id); toast({ title: 'Deleted', type: 'success' }); paged.refresh() }
        catch (err) { toast({ title: 'Delete failed', message: err.message, type: 'error' }) }
      }}
      exportFilename="items-export.csv"
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
