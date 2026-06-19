import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card, { CardHeader } from '../../components/ui/Card'
import ChartPlaceholder from '../../components/ui/ChartPlaceholder'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { gstSummary } from '../../data/accounting'

export default function GSTReports() {
  const statusCards = [
    { label: 'Input GST', color: 'orange', icon: 'ArrowDownLeft', count: formatCurrency(gstSummary.inputGST) },
    { label: 'Output GST', color: 'green', icon: 'ArrowUpRight', count: formatCurrency(gstSummary.outputGST) },
    { label: 'Net GST Payable', color: 'blue', icon: 'IndianRupee', count: formatCurrency(gstSummary.netGST) },
    { label: 'GST Entries', color: 'violet', icon: 'FileSpreadsheet', count: gstSummary.inputBreakdown.length + gstSummary.outputBreakdown.length },
  ]

  return (
    <ERPContentPage module="Accounting" title="GST Reports">
      <div className="space-y-4">
        <StatusSummaryCards cards={statusCards} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <ChartPlaceholder title="Input GST (Monthly)" type="bar" data={gstSummary.inputBreakdown.map((d) => ({ month: d.month, value: d.amount / 1000 }))} />
          </Card>
          <Card>
            <ChartPlaceholder title="Output GST (Monthly)" type="bar" data={gstSummary.outputBreakdown.map((d) => ({ month: d.month, value: d.amount / 1000 }))} />
          </Card>
        </div>
        <Card>
          <CardHeader title="GST Ledger" subtitle="Consolidated GST transactions" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'CGST Input', value: 142700 },
              { label: 'SGST Input', value: 142700 },
              { label: 'CGST Output', value: 235400 },
              { label: 'SGST Output', value: 235400 },
              { label: 'IGST Input', value: 0 },
              { label: 'IGST Output', value: 0 },
            ].map((item) => (
              <div key={item.label} className="flex justify-between rounded-lg border border-slate-100 px-4 py-3 dark:border-slate-800">
                <span>{item.label}</span>
                <span className="font-semibold">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ERPContentPage>
  )
}
