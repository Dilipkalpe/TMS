import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { vendorsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { importTemplates } from '../../config/importTemplates'

export default function VendorList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      vendorsApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'category' })),
    [],
  )

  const columns = [
    { key: 'name', label: 'Vendor' },
    { key: 'contact', label: 'Contact' },
    { key: 'category', label: 'Category' },
    { key: 'phone', label: 'Phone' },
    { key: 'totalBills', label: 'Bills' },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.vendors)}
      module="Vendors"
      title="Vendor Management"
      statusCards={[{ label: 'Total Vendors', color: 'blue', icon: 'Building2', count: paged.total }]}
      searchPlaceholder="Name, category, contact..."
      filterOptions={['(All)', 'Fuel', 'Maintenance', 'Toll', 'Office']}
      filterKey="category"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="name"
      onRowClick={(r) => navigate(`/vendors/${r.id}`)}
      onEdit={(r) => navigate(`/vendors/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete vendor ${r.name}?`)) return
        try { await vendorsApi.remove(r.id); toast({ title: 'Deleted', type: 'success' }); paged.refresh() }
        catch (err) { toast({ title: 'Delete failed', message: err.message, type: 'error' }) }
      }}
      exportFilename="vendors-export.csv"
      importTemplate={importTemplates.vendors}
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
