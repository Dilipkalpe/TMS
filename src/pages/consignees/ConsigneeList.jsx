import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { consigneesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { withAuditColumns } from '../../utils/auditColumns'

export default function ConsigneeList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      consigneesApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'status' })),
    [],
  )

  const columns = withAuditColumns([
    { key: 'name', label: 'Consignee' },
    { key: 'companyName', label: 'Company', render: (r) => r.companyName || '—' },
    { key: 'city', label: 'City', render: (r) => r.city || '—' },
    { key: 'phone', label: 'Mobile' },
    { key: 'gst', label: 'GST' },
    { key: 'defaultToLocation', label: 'Default To', render: (r) => r.defaultToLocation || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ])

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.consignees)}
      module="Consignees"
      title="Consignee Master"
      statusCards={[{ label: 'Total Consignees', color: 'blue', icon: 'Users', count: paged.total }]}
      searchPlaceholder="Name, city, GST, mobile…"
      filterOptions={['(All)', 'Active', 'Inactive']}
      filterKey="status"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="name"
      onRowClick={(r) => navigate(`/consignees/${r.id}`)}
      onEdit={(r) => navigate(`/consignees/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete consignee ${r.name}?`)) return
        try { await consigneesApi.remove(r.id); toast({ title: 'Deleted', type: 'success' }); paged.refresh() }
        catch (err) { toast({ title: 'Delete failed', message: err.message, type: 'error' }) }
      }}
      exportFilename="consignees-export.csv"
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
