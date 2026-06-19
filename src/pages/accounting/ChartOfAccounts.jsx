import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card, { CardHeader } from '../../components/ui/Card'
import { chartOfAccounts } from '../../data/accounting'
import { formatCurrency } from '../../components/ui/ReportFilters'

export default function ChartOfAccounts() {
  const sections = Object.entries(chartOfAccounts)
  const totalAccounts = sections.reduce((s, [, accounts]) => s + accounts.length, 0)

  const statusCards = [
    { label: 'Asset Groups', color: 'green', icon: 'Landmark', count: chartOfAccounts.Assets?.length || 0 },
    { label: 'Liability Groups', color: 'orange', icon: 'Scale', count: chartOfAccounts.Liabilities?.length || 0 },
    { label: 'Income Groups', color: 'blue', icon: 'TrendingUp', count: chartOfAccounts.Income?.length || 0 },
    { label: 'Total Accounts', color: 'violet', icon: 'BookOpen', count: totalAccounts },
  ]

  return (
    <ERPContentPage module="Accounting" title="Chart of Accounts">
      <div className="space-y-4">
        <StatusSummaryCards cards={statusCards} />
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map(([title, accounts]) => (
            <Card key={title}>
              <CardHeader title={title} />
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div key={acc.code} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-medium">{acc.name}</p>
                      <p className="text-xs text-slate-500">{acc.code}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{formatCurrency(acc.balance)}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ERPContentPage>
  )
}
