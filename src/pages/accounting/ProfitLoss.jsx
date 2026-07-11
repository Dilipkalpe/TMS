import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card, { CardHeader } from '../../components/ui/Card'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { TablePrintButton } from '../../components/print/ReportPrintButton'
import { useApiObject } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'

export default function ProfitLoss() {
  const { data: profitLoss, loading, error } = useApiObject(() => accountingApi.profitLoss())
  const income = profitLoss?.income ?? []
  const expenses = profitLoss?.expenses ?? []
  const totalIncome = income.reduce((s, i) => s + (i.amount ?? 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const grossProfit = totalIncome - totalExpenses

  const statusCards = [
    { label: 'Total Income', color: 'green', icon: 'TrendingUp', count: formatCurrency(totalIncome) },
    { label: 'Total Expenses', color: 'red', icon: 'TrendingDown', count: formatCurrency(totalExpenses) },
    { label: 'Gross Profit', color: 'blue', icon: 'IndianRupee', count: formatCurrency(grossProfit) },
    { label: 'Net Profit', color: 'green', icon: 'CheckCircle', count: formatCurrency(grossProfit) },
  ]

  const printRows = [
    ...income.map((item) => ({ section: 'Income', name: item.name, amount: item.amount })),
    ...expenses.map((item) => ({ section: 'Expense', name: item.name, amount: item.amount })),
  ]
  const printColumns = [
    { key: 'section', label: 'Section' },
    { key: 'name', label: 'Particular' },
    { key: 'amount', label: 'Amount', printValue: (r) => formatCurrency(r.amount) },
  ]

  if (loading) {
    return (
      <ERPContentPage module="Accounting" title="Profit & Loss Statement">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage
      module="Accounting"
      title="Profit & Loss Statement"
      toolbar={(
        <div className="flex justify-end">
          <TablePrintButton
            title="Profit & Loss Statement"
            columns={printColumns}
            rows={printRows}
            summary={`Income: ${formatCurrency(totalIncome)} · Expenses: ${formatCurrency(totalExpenses)} · Net: ${formatCurrency(grossProfit)}`}
          />
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <StatusSummaryCards cards={statusCards} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Income" />
            <div className="space-y-2">
              {income.map((item) => (
                <div key={item.name} className="flex justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                  <span>{item.name}</span>
                  <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-bold">
                <span>Total Income</span>
                <span className="text-green-600">{formatCurrency(totalIncome)}</span>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Expenses" />
            <div className="space-y-2">
              {expenses.length === 0 && (
                <p className="py-2 text-sm text-slate-500">No expenses recorded yet (global expenses, booking expenses, or broker charges).</p>
              )}
              {expenses.map((item) => (
                <div key={item.name} className="flex justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                  <span>{item.name}</span>
                  <span className="font-medium text-red-500">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-bold">
                <span>Total Expenses</span>
                <span className="text-red-500">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ERPContentPage>
  )
}
