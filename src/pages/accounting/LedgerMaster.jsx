import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge from '../../components/ui/Badge'
import { ledgerMasters } from '../../data/accounting'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function LedgerMaster() {
  const navigate = useNavigate()
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
      data={ledgerMasters}
      sortKey="code"
    />
  )
}
