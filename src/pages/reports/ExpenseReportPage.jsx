import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { expenseReport } from '../../data/reports'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function ExpenseReportPage() {
  const navigate = useNavigate()
  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'fuel', label: 'Fuel', render: (r) => formatCurrency(r.fuel) },
    { key: 'salary', label: 'Salary', render: (r) => formatCurrency(r.salary) },
    { key: 'toll', label: 'Toll', render: (r) => formatCurrency(r.toll) },
    { key: 'maintenance', label: 'Maintenance', render: (r) => formatCurrency(r.maintenance) },
    { key: 'office', label: 'Office', render: (r) => formatCurrency(r.office) },
    { key: 'total', label: 'Total', render: (r) => <span className="font-semibold text-red-500">{formatCurrency(r.total)}</span> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Expense Report"
      statusCards={registerStatusCards('Total Months', expenseReport.length, 'red', 'TrendingDown')}
showActions={false}
      searchKeys={['month']}
      columns={columns}
      data={expenseReport}
      sortKey="month"
      defaultSortDir="asc"
      filterRow={<ReportFilterRow />}
    />
  )
}
