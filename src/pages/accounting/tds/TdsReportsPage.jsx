import { useCallback, useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import { tdsApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { formatCurrency } from '../../../components/ui/ReportFilters'
import { RefreshCw, Printer } from 'lucide-react'

export default function TdsReportsPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('summary')
  const [filters, setFilters] = useState({
    financialYear: '',
    from: '',
    to: '',
    direction: '',
  })
  const [summary, setSummary] = useState(null)
  const [vendorWise, setVendorWise] = useState([])
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(false)

  const params = () => {
    const p = {}
    if (filters.financialYear) p.financialYear = filters.financialYear
    if (filters.from) p.from = filters.from
    if (filters.to) p.to = filters.to
    if (filters.direction) p.direction = filters.direction
    return p
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = params()
      if (tab === 'summary') {
        setSummary(await tdsApi.reportSummary(p))
      } else if (tab === 'vendor') {
        setVendorWise(await tdsApi.reportVendorWise(p) || [])
      } else {
        setDetails(await tdsApi.reportDetails(p) || [])
      }
    } catch (err) {
      toast({ title: 'Report failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [tab, filters, toast])

  useEffect(() => { load() }, [load])

  const detailColumns = [
    { key: 'transactionDate', label: 'Date' },
    { key: 'direction', label: 'Direction' },
    { key: 'sectionCode', label: 'Section' },
    { key: 'partyName', label: 'Party' },
    { key: 'baseAmount', label: 'Base', render: (r) => formatCurrency(r.baseAmount) },
    { key: 'tdsAmount', label: 'TDS', render: (r) => formatCurrency(r.tdsAmount) },
    { key: 'status', label: 'Status' },
    { key: 'financialYear', label: 'FY' },
  ]

  const vendorColumns = [
    { key: 'partyName', label: 'Vendor' },
    { key: 'partyId', label: 'Id' },
    { key: 'count', label: 'Txns' },
    { key: 'baseAmount', label: 'Base', render: (r) => formatCurrency(r.baseAmount) },
    { key: 'tdsAmount', label: 'TDS', render: (r) => formatCurrency(r.tdsAmount) },
  ]

  return (
    <ERPContentPage
      module="Accounting"
      title="TDS Reports"
      toolbar={(
        <Button variant="outline" icon={Printer} className="no-print" onClick={() => window.print()}>
          Print
        </Button>
      )}
    >
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { id: 'summary', label: 'Payable / Receivable Summary' },
            { id: 'vendor', label: 'Vendor-wise' },
            { id: 'details', label: 'Transaction Detail' },
          ].map((t) => (
            <Button key={t.id} variant={tab === t.id ? 'default' : 'outline'} onClick={() => setTab(t.id)}>
              {t.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Financial Year" value={filters.financialYear} onChange={(e) => setFilters((f) => ({ ...f, financialYear: e.target.value }))} placeholder="2025-26" />
          <Input label="From" type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          <Input label="To" type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          {tab === 'details' && (
            <Select
              label="Direction"
              options={[{ value: '', label: 'All' }, { value: 'PAYABLE', label: 'Payable' }, { value: 'RECEIVABLE', label: 'Receivable' }]}
              value={filters.direction}
              onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
            />
          )}
        </div>
        <Button className="mt-3" variant="outline" icon={RefreshCw} onClick={load}>Run Report</Button>
      </Card>

      <Card className="mt-4" padding={tab === 'summary'}>
        {loading ? (
          <p className="px-4 py-4 text-sm text-slate-500">Loading…</p>
        ) : tab === 'summary' && summary ? (
          <>
            <CardHeader title={`Summary · FY ${summary.financialYear || '—'}`} />
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
                <p className="text-xs text-slate-500">TDS Payable</p>
                <p className="text-xl font-bold">{formatCurrency(summary.payable)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                <p className="text-xs text-slate-500">TDS Receivable</p>
                <p className="text-xl font-bold">{formatCurrency(summary.receivable)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs text-slate-500">Posted</p>
                <p className="text-xl font-bold">{summary.postedCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs text-slate-500">Reversed</p>
                <p className="text-xl font-bold">{summary.reversedCount}</p>
              </div>
            </div>
          </>
        ) : tab === 'vendor' ? (
          <ERPDataTable columns={vendorColumns} data={vendorWise} showActions={false} selectable={false} exportFilename="tds-vendor-wise" />
        ) : (
          <ERPDataTable columns={detailColumns} data={details} showActions={false} selectable={false} exportFilename="tds-details" />
        )}
      </Card>
    </ERPContentPage>
  )
}
