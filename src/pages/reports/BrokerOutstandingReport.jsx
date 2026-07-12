import ERPContentPage from '../../components/ui/ERPContentPage'
import ERPDataTable from '../../components/ui/ERPDataTable'
import ReportTableToolbar from '../../components/ui/ReportTableToolbar'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { bookingFinanceApi } from '../../services/api'

export default function BrokerOutstandingReport() {
  const { data: items, loading, error } = useApiResource(() => bookingFinanceApi.brokerOutstanding())

  const columns = [
    { key: 'brokerName', label: 'Broker' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'payable', label: 'Payable Amount', render: (r) => formatCurrency(r.payable) },
  ]

  const printColumns = columns.map((c) => ({ ...c, printValue: c.render }))
  const totalPayable = items.reduce((s, r) => s + (r.payable ?? 0), 0)

  return (
    <ERPContentPage module="Reports" title="Broker-wise Outstanding" report>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Amount you owe brokers from booking charges. Broker payment recording is not yet available — full charge shows as payable.
      </p>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      <ReportTableToolbar
        title="Broker-wise Outstanding"
        columns={printColumns}
        rows={items}
        filename="broker-outstanding.csv"
        summary={`${items.length} broker(s) · Total payable ${formatCurrency(totalPayable)}`}
      />
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
        <ERPDataTable columns={columns} data={items} showActions={false} />
      )}
    </ERPContentPage>
  )
}

