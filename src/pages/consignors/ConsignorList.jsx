import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { consignorsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { withAuditColumns } from '../../utils/auditColumns'

export default function ConsignorList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      consignorsApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'status' })),
    [],
  )

  const columns = withAuditColumns([
    { key: 'name', label: 'Consignor' },
    { key: 'companyName', label: 'Company', render: (r) => r.companyName || '—' },
    { key: 'city', label: 'City', render: (r) => r.city || '—' },
    { key: 'phone', label: 'Mobile' },
    { key: 'gst', label: 'GST' },
    { key: 'defaultFromLocation', label: 'Default From', render: (r) => r.defaultFromLocation || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ])

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.consignors)}
      module="Consignors"
      title="Consignor Master"
      statusCards={[{ label: 'Total Consignors', color: 'blue', icon: 'Users', count: paged.total }]}
      searchPlaceholder="Name, city, GST, mobile…"
      filterOptions={['(All)', 'Active', 'Inactive']}
      filterKey="status"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="name"
      onRowClick={(r) => navigate(`/consignors/${r.id}`)}
      onEdit={(r) => navigate(`/consignors/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete consignor ${r.name}?`)) return
        try { await consignorsApi.remove(r.id); toast({ title: 'Deleted', type: 'success' }); paged.refresh() }
        catch (err) { toast({ title: 'Delete failed', message: err.message, type: 'error' }) }
      }}
      exportFilename="consignors-export.csv"
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
