import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { expensesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const expenseCategories = ['Fuel', 'Toll', 'Maintenance', 'Salary', 'Office Expense', 'Miscellaneous']

export default function ExpenseList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      expensesApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'category' })),
    [],
  )

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'paymentMode', label: 'Mode' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.expenses)}
      module="Expenses"
      title="Expense Management"
      statusCards={[{ label: 'Total Expenses', color: 'blue', icon: 'Receipt', count: paged.total }]}
      searchPlaceholder="Description, vehicle, vendor..."
      filterOptions={['(All)', ...expenseCategories]}
      filterKey="category"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="date"
      onDelete={async (r) => {
        if (!window.confirm(`Delete expense ${r.id}?`)) return
        try { await expensesApi.remove(r.id); toast({ title: 'Deleted', type: 'success' }); paged.refresh() }
        catch (err) { toast({ title: 'Delete failed', message: err.message, type: 'error' }) }
      }}
      exportFilename="expenses-export.csv"
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
