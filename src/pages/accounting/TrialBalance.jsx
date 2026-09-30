import { useMemo } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card from '../../components/ui/Card'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { TablePrintButton } from '../../components/print/ReportPrintButton'
import { useApiObject } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'

function normalizeRows(payload) {
  const raw = Array.isArray(payload) ? payload : (payload?.rows ?? [])
  return raw.map((r) => ({
    ...r,
    account: r.account ?? ([r.code, r.name].filter(Boolean).join(' — ') || r.name || r.code || '—'),
    debit: Number(r.debit ?? 0),
    credit: Number(r.credit ?? 0),
  }))
}

export default function TrialBalance() {
  const { data: payload, loading, error } = useApiObject(() => accountingApi.trialBalance())
  const rows = useMemo(() => normalizeRows(payload), [payload])
  const totalDebit = payload?.totalDebit != null
    ? Number(payload.totalDebit)
    : rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = payload?.totalCredit != null
    ? Number(payload.totalCredit)
    : rows.reduce((s, r) => s + r.credit, 0)

  const statusCards = [
    { label: 'Total Debit', color: 'green', icon: 'ArrowUpRight', count: formatCurrency(totalDebit) },
    { label: 'Total Credit', color: 'red', icon: 'ArrowDownLeft', count: formatCurrency(totalCredit) },
    { label: 'Accounts', color: 'blue', icon: 'BookOpen', count: rows.length },
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
            rows={rows}
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
            <ERPDataTable columns={columns} data={rows} showActions={false} selectable={false} />
          )}
        </Card>
      </div>
    </ERPContentPage>
  )
}
