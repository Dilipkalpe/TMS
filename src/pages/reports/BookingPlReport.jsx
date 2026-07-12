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

export default function BookingPlReport() {
  const { toast } = useToast()
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const load = useCallback(
    () => bookingFinanceApi.bookingProfitLossReport(applied),
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
    { key: 'bookingId', label: 'Booking' },
    { key: 'bookingDate', label: 'Date', render: (r) => formatGridDate(r.bookingDate) },
    { key: 'customer', label: 'Customer' },
    { key: 'route', label: 'Route' },
    { key: 'income', label: 'Income', render: (r) => formatCurrency(r.income) },
    { key: 'brokerCharges', label: 'Broker', render: (r) => formatCurrency(r.brokerCharges) },
    { key: 'expenses', label: 'Expenses', render: (r) => formatCurrency(r.expenses) },
    { key: 'profit', label: 'Profit', render: (r) => formatCurrency(r.profit) },
    { key: 'marginPercent', label: 'Margin %', render: (r) => `${r.marginPercent}%` },
  ]

  const printColumns = columns.map((c) => ({
    ...c,
    printValue: c.render,
  }))

  const totalProfit = items.reduce((s, r) => s + (r.profit ?? 0), 0)
  const rangeLabel = `${formatGridDate(applied.fromDate)} – ${formatGridDate(applied.toDate)}`

  return (
    <ERPContentPage module="Reports" title="Booking-wise Profit & Loss" report>
      <Card className="mb-4 px-4 py-3">
        <ReportFilterRow
          inline
          value={filters}
          onChange={setFilters}
          onApply={handleApply}
        />
        <p className="mt-2 text-xs text-slate-500">
          Showing {items.length} booking(s) for {rangeLabel}
        </p>
      </Card>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      <ReportTableToolbar
        title="Booking-wise Profit & Loss"
        columns={printColumns}
        rows={items}
        filename="booking-profit-loss.csv"
        summary={`${items.length} booking(s) · ${rangeLabel} · Total profit ${formatCurrency(totalProfit)}`}
      />
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
        <ERPDataTable
          columns={columns}
          data={items}
          pageSize={Math.max(items.length, 25)}
          showActions={false}
          emptyMessage="No bookings found for the selected date range."
        />
      )}
    </ERPContentPage>
  )
}
