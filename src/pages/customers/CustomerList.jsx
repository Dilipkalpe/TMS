import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { customersApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { importTemplates } from '../../config/importTemplates'

export default function CustomerList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => customersApi.list(buildListParams({ page, pageSize, search })),
    [],
  )

  const columns = [
    { key: 'name', label: 'Customer' },
    { key: 'contact', label: 'Contact' },
    { key: 'phone', label: 'Phone' },
    { key: 'gst', label: 'GST No.' },
    { key: 'totalTrips', label: 'Trips' },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.customers)}
      module="Customers"
      title="Customer List"
      statusCards={[{ label: 'Total Customers', color: 'blue', icon: 'Users', count: paged.total }]}
      searchPlaceholder="Customer name, contact..."
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="name"
      onRowClick={(r) => navigate(`/customers/${r.id}`)}
      onEdit={(r) => navigate(`/customers/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete customer ${r.name}?`)) return
        try { await customersApi.remove(r.id); toast({ title: 'Deleted', type: 'success' }); paged.refresh() }
        catch (err) { toast({ title: 'Delete failed', message: err.message, type: 'error' }) }
      }}
      exportFilename="customers-export.csv"
      importTemplate={importTemplates.customers}
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
