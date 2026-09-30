import { Link } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiObject } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'

export default function GSTReports() {
  const { data: gstSummary, loading, error } = useApiObject(() => accountingApi.gst())
  const inputBreakdown = gstSummary?.inputBreakdown ?? []
  const outputBreakdown = gstSummary?.outputBreakdown ?? []
  const hasData = (gstSummary?.outputGST ?? 0) > 0 || (gstSummary?.inputGST ?? 0) > 0

  const statusCards = [
    { label: 'Input GST', color: 'orange', icon: 'ArrowDownLeft', count: formatCurrency(gstSummary?.inputGST ?? 0) },
    { label: 'Output GST', color: 'green', icon: 'ArrowUpRight', count: formatCurrency(gstSummary?.outputGST ?? 0) },
    { label: 'Net GST Payable', color: 'blue', icon: 'IndianRupee', count: formatCurrency(gstSummary?.netGST ?? 0) },
    { label: 'GST Entries', color: 'violet', icon: 'FileSpreadsheet', count: inputBreakdown.length + outputBreakdown.length },
  ]

  if (loading) {
    return (
      <ERPContentPage module="Accounting" title="GST Reports">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage module="Accounting" title="GST Reports">
      <div className="space-y-4">
        <Card>
          <CardHeader title="GSTR / e-Invoice / Form 26Q" subtitle="Filing registers from the double-entry GL" />
          <p className="mb-3 text-sm text-slate-500">
            Use the compliance workspace for GSTR-1, GSTR-3B worksheets, Form 26Q CSV, and the local e-Invoice IRN register.
          </p>
          <Link to="/accounting/gl/compliance">
            <Button>Open GST / TDS Compliance</Button>
          </Link>
        </Card>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!hasData ? (
          <Card>
            <CardHeader title="Legacy LR GST summary" subtitle="Appears when lorry receipts include GST amounts." />
            <p className="text-sm text-slate-500">Prefer freight invoices + GL compliance for GSTR worksheets.</p>
          </Card>
        ) : (
          <>
            <StatusSummaryCards cards={statusCards} />
            {outputBreakdown.length > 0 && (
              <Card>
                <CardHeader title="Output GST (from LR)" />
                <div className="space-y-2">
                  {outputBreakdown.map((d) => (
                    <div key={d.month} className="flex justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                      <span>{d.month}</span>
                      <span className="font-medium">{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </ERPContentPage>
  )
}
