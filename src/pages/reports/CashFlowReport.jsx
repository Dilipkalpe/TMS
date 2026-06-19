import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { cashFlowReport } from '../../data/reports'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function CashFlowReport() {
  const navigate = useNavigate()
  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'inflow', label: 'Inflow', render: (r) => <span className="text-green-600">{formatCurrency(r.inflow)}</span> },
    { key: 'outflow', label: 'Outflow', render: (r) => <span className="text-red-500">{formatCurrency(r.outflow)}</span> },
    { key: 'net', label: 'Net Cash Flow', render: (r) => <span className={`font-semibold ${r.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(r.net)}</span> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Cash Flow Report"
      statusCards={registerStatusCards('Total Months', cashFlowReport.length, 'blue', 'Banknote')}
showActions={false}
      searchKeys={['month']}
      columns={columns}
      data={cashFlowReport}
      sortKey="month"
      defaultSortDir="asc"
      filterRow={<ReportFilterRow />}
    />
  )
}
