import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { expenses, expenseCategories } from '../../data/expenses'
import { expenseCategoryCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function ExpenseList() {
  const navigate = useNavigate()
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
      statusCards={expenseCategoryCards(expenses)}
      
      searchPlaceholder="Description, vehicle, vendor..."
      searchKeys={['id', 'description', 'vehicle', 'vendor', 'category']}
      filterOptions={['(All)', ...expenseCategories]}
      filterKey="category"
      columns={columns}
      data={expenses}
      sortKey="date"
    />
  )
}
