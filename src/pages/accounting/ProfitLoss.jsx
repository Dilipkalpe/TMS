import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card, { CardHeader } from '../../components/ui/Card'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { profitLoss } from '../../data/accounting'

export default function ProfitLoss() {
  const totalIncome = profitLoss.income.reduce((s, i) => s + i.amount, 0)
  const totalExpenses = profitLoss.expenses.reduce((s, e) => s + e.amount, 0)
  const grossProfit = totalIncome - totalExpenses

  const statusCards = [
    { label: 'Total Income', color: 'green', icon: 'TrendingUp', count: formatCurrency(totalIncome) },
    { label: 'Total Expenses', color: 'red', icon: 'TrendingDown', count: formatCurrency(totalExpenses) },
    { label: 'Gross Profit', color: 'blue', icon: 'IndianRupee', count: formatCurrency(grossProfit) },
    { label: 'Net Profit', color: 'green', icon: 'CheckCircle', count: formatCurrency(grossProfit) },
  ]

  return (
    <ERPContentPage module="Accounting" title="Profit & Loss Statement">
      <div className="space-y-4">
        <StatusSummaryCards cards={statusCards} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Income" />
            <div className="space-y-2">
              {profitLoss.income.map((item) => (
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
              {profitLoss.expenses.map((item) => (
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
