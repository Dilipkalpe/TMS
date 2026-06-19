import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card, { CardHeader } from '../../components/ui/Card'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { balanceSheet } from '../../data/accounting'

function Section({ title, items }) {
  const total = items.reduce((s, i) => s + i.amount, 0)
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="flex justify-between border-b border-slate-100 py-2 dark:border-slate-800">
            <span>{item.name}</span>
            <span className="font-medium">{formatCurrency(item.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 font-bold">
          <span>Total {title}</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
    </Card>
  )
}

export default function BalanceSheet() {
  const assetsTotal = balanceSheet.assets.reduce((s, i) => s + i.amount, 0)
  const liabilitiesTotal = balanceSheet.liabilities.reduce((s, i) => s + i.amount, 0)
  const capitalTotal = balanceSheet.capital.reduce((s, i) => s + i.amount, 0)
  const isBalanced = assetsTotal === liabilitiesTotal + capitalTotal

  const statusCards = [
    { label: 'Total Assets', color: 'green', icon: 'Landmark', count: formatCurrency(assetsTotal) },
    { label: 'Total Liabilities', color: 'orange', icon: 'Scale', count: formatCurrency(liabilitiesTotal) },
    { label: 'Total Capital', color: 'blue', icon: 'Building2', count: formatCurrency(capitalTotal) },
    { label: 'Balanced', color: isBalanced ? 'green' : 'red', icon: 'CheckCircle', count: isBalanced ? 'Yes' : 'No' },
  ]

  return (
    <ERPContentPage module="Accounting" title="Balance Sheet">
      <div className="space-y-4">
        <StatusSummaryCards cards={statusCards} />
        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Assets" items={balanceSheet.assets} />
          <Section title="Liabilities" items={balanceSheet.liabilities} />
          <Section title="Capital" items={balanceSheet.capital} />
        </div>
        <Card className="text-center">
          <p className="text-sm text-slate-500">
            Assets ({formatCurrency(assetsTotal)}) = Liabilities ({formatCurrency(liabilitiesTotal)}) + Capital ({formatCurrency(capitalTotal)})
          </p>
          {isBalanced && (
            <p className="mt-2 font-medium text-green-600">✓ Balance Sheet is balanced</p>
          )}
        </Card>
      </div>
    </ERPContentPage>
  )
}
