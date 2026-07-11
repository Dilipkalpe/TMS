import { useMemo, useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card, { CardHeader } from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { TablePrintButton } from '../../components/print/ReportPrintButton'
import { useApiObject } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'

function Section({ title, items }) {
  const total = items.reduce((s, i) => s + (i.amount ?? 0), 0)
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
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </Card>
  )
}

export default function BalanceSheet() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const params = useMemo(() => ({ month, year }), [month, year])
  const { data, loading, error, refresh } = useApiObject(() => accountingApi.balanceSheet(params), [month, year])

  const assets = data?.assets ?? []
  const liabilities = data?.liabilities ?? []
  const capital = data?.capital ?? []
  const totalAssets = assets.reduce((s, i) => s + (i.amount ?? 0), 0)
  const totalLiab = liabilities.reduce((s, i) => s + (i.amount ?? 0), 0) + capital.reduce((s, i) => s + (i.amount ?? 0), 0)

  const statusCards = [
    { label: 'Period', color: 'blue', icon: 'Calendar', count: data?.periodLabel ?? 'Current' },
    { label: 'Total Assets', color: 'green', icon: 'Landmark', count: formatCurrency(totalAssets) },
    { label: 'Total Liabilities', color: 'orange', icon: 'Scale', count: formatCurrency(liabilities.reduce((s, i) => s + i.amount, 0)) },
    { label: 'Balanced', color: 'violet', icon: 'CheckCircle', count: Math.abs(totalAssets - totalLiab) < 1 ? 'Yes' : 'No' },
  ]

  const printRows = [
    ...assets.map((item) => ({ group: 'Assets', name: item.name, amount: item.amount })),
    ...liabilities.map((item) => ({ group: 'Liabilities', name: item.name, amount: item.amount })),
    ...capital.map((item) => ({ group: 'Capital', name: item.name, amount: item.amount })),
  ]
  const printColumns = [
    { key: 'group', label: 'Group' },
    { key: 'name', label: 'Account' },
    { key: 'amount', label: 'Amount', printValue: (r) => formatCurrency(r.amount) },
  ]

  if (loading) {
    return (
      <ERPContentPage module="Accounting" title="Balance Sheet">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage
      module="Accounting"
      title="Monthly Balance Sheet"
      toolbar={(
        <div className="flex flex-wrap items-end justify-end gap-2">
          <Input label="Month" type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} className="w-24" />
          <Input label="Year" type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" />
          <Button variant="outline" onClick={refresh}>Apply</Button>
          <TablePrintButton
            title={`Balance Sheet — ${data?.periodLabel ?? ''}`}
            columns={printColumns}
            rows={printRows}
            summary={`Total Assets: ${formatCurrency(totalAssets)} · Total Liabilities & Capital: ${formatCurrency(totalLiab)}`}
          />
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <StatusSummaryCards cards={statusCards} />
        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Assets" items={assets} />
          <Section title="Liabilities" items={liabilities} />
          <Section title="Capital" items={capital} />
        </div>
      </div>
    </ERPContentPage>
  )
}
