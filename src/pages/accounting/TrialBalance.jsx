import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card from '../../components/ui/Card'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { TablePrintButton } from '../../components/print/ReportPrintButton'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'

export default function TrialBalance() {
  const { data, loading, error } = useApiResource(() => accountingApi.trialBalance())
  const totalDebit = data.reduce((s, r) => s + (r.debit ?? 0), 0)
  const totalCredit = data.reduce((s, r) => s + (r.credit ?? 0), 0)

  const statusCards = [
    { label: 'Total Debit', color: 'green', icon: 'ArrowUpRight', count: formatCurrency(totalDebit) },
    { label: 'Total Credit', color: 'red', icon: 'ArrowDownLeft', count: formatCurrency(totalCredit) },
    { label: 'Accounts', color: 'blue', icon: 'BookOpen', count: data.length },
    { label: 'Difference', color: 'violet', icon: 'Scale', count: formatCurrency(Math.abs(totalDebit - totalCredit)) },
  ]

  const columns = [
    { key: 'account', label: 'Account' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
  ]

  return (
    <ERPContentPage
      module="Accounting"
      title="Trial Balance"
      toolbar={(
        <div className="flex justify-end">
          <TablePrintButton
            title="Trial Balance"
            columns={columns}
            rows={data}
            summary={`Total Debit: ${formatCurrency(totalDebit)} · Total Credit: ${formatCurrency(totalCredit)}`}
          />
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <StatusSummaryCards cards={statusCards} />
        <Card padding={false}>
          {loading ? <p className="p-4 text-sm text-slate-500">Loading…</p> : (
            <ERPDataTable columns={columns} data={data} showActions={false} />
          )}
        </Card>
      </div>
    </ERPContentPage>
  )
}
