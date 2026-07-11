import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'

export default function DriverLedgerReport() {
  const { data, loading, error, refresh } = useApiResource(() => accountingApi.driverLedger())
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'salary', label: 'Salary', render: (r) => (r.salary ? formatCurrency(r.salary) : '-') },
    { key: 'advance', label: 'Advance', render: (r) => (r.advance ? formatCurrency(r.advance) : '-') },
    { key: 'deduction', label: 'Deduction', render: (r) => (r.deduction ? formatCurrency(r.deduction) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  return (
    <ERPListPage
      module="Accounting"
      title="Driver Ledger Report"
      statusCards={registerStatusCards('Total Entries', data.length, 'violet', 'UserCircle')}
      showActions={false}
      searchPlaceholder="Type..."
      searchKeys={['type']}
      columns={columns}
      data={data}
      sortKey="date"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      filterRow={<ReportFilterRow showDriver />}
    />
  )
}
