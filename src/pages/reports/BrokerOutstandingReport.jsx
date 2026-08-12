import { useCallback, useMemo, useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import ERPDataTable from '../../components/ui/ERPDataTable'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import ReportTableToolbar from '../../components/ui/ReportTableToolbar'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { bookingFinanceApi } from '../../services/api'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'
import { useToast } from '../../context/ToastContext'

function formatGridDate(value) {
  if (!value) return '—'
  const [y, m, d] = String(value).slice(0, 10).split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

export default function BrokerOutstandingReport() {
  const { toast } = useToast()
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const load = useCallback(
    () => bookingFinanceApi.brokerOutstanding(applied),
    [applied],
  )
  const { data: items, loading, error } = useApiResource(load, [applied.fromDate, applied.toDate])

  const handleApply = () => {
    if (!filters.fromDate || !filters.toDate) {
      toast({ title: 'Select dates', message: 'From Date and To Date are required.', type: 'warning' })
      return
    }
    if (filters.fromDate > filters.toDate) {
      toast({ title: 'Invalid range', message: 'From Date cannot be after To Date.', type: 'warning' })
      return
    }
    setApplied(toReportQuery(filters))
  }

  const columns = [
    { key: 'brokerName', label: 'Broker' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'payable', label: 'Payable Amount', render: (r) => formatCurrency(r.payable) },
  ]

  const printColumns = columns.map((c) => ({ ...c, printValue: c.render }))
  const totalPayable = items.reduce((s, r) => s + (r.payable ?? 0), 0)
  const rangeLabel = `${formatGridDate(applied.fromDate)} – ${formatGridDate(applied.toDate)}`

  return (
    <ERPContentPage module="Reports" title="Broker-wise Outstanding" report>
      <Card className="mb-4 px-4 py-3">
        <ReportFilterRow
          inline
          value={filters}
          onChange={setFilters}
          onApply={handleApply}
        />
        <p className="mt-2 text-xs text-slate-500">
          Showing {items.length} broker(s) for {rangeLabel}
        </p>
      </Card>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Amount you owe brokers from booking charges in the selected period.
      </p>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      <ReportTableToolbar
        title="Broker-wise Outstanding"
        columns={printColumns}
        rows={items}
        filename="broker-outstanding.csv"
        summary={`${items.length} broker(s) · ${rangeLabel} · Total payable ${formatCurrency(totalPayable)}`}
      />
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
        <ERPDataTable columns={columns} data={items} showActions={false} selectable={false} />
      )}
    </ERPContentPage>
  )
}
