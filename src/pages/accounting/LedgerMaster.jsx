import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function LedgerMaster() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useApiResource(() => accountingApi.ledgerMaster())
  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Ledger Name' },
    { key: 'type', label: 'Type', render: (r) => <Badge variant="info">{r.type}</Badge> },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.ledger)}
      module="Accounting"
      title="Ledger Master"
      searchPlaceholder="Code, ledger name..."
      searchKeys={['code', 'name', 'type']}
      filterOptions={['(All)', 'Asset', 'Liability', 'Income', 'Expense', 'Capital']}
      filterKey="type"
      columns={columns}
      data={data}
      sortKey="code"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
    />
  )
}
