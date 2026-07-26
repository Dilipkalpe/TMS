import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { accountingApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { serverListProps } from '../../utils/serverListProps'

export default function LedgerMaster() {
  const navigate = useNavigate()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      accountingApi.ledgerMaster(buildListParams({ page, pageSize, search, filter, filterKey: 'type' })),
    [],
  )
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
      sortKey="code"
      {...serverListProps(paged)}
    />
  )
}
