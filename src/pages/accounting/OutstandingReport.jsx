import { useCallback, useMemo, useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card from '../../components/ui/Card'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Tabs from '../../components/ui/Tabs'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiObject } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function OutstandingReport() {
  const [filters, setFilters] = useState(defaultReportFilters)
  const [query, setQuery] = useState(() => toReportQuery(defaultReportFilters()))

  const load = useCallback(() => accountingApi.outstanding(query), [JSON.stringify(query)])
  const { data, loading, error } = useApiObject(load, [JSON.stringify(query)])

  const outstandingCustomers = data?.customers ?? []
  const outstandingVendors = data?.vendors ?? []
  const outstandingParties = data?.parties ?? []

  const customerBalanceTotal = outstandingCustomers.reduce((s, r) => s + (r.balance ?? 0), 0)
  const customerOutstandingTotal = outstandingCustomers.reduce((s, r) => s + (r.outstanding ?? 0), 0)
  const customerPendingTotal = outstandingCustomers.reduce(
    (s, r) => s + (r.totalPending ?? r.amount ?? 0),
    0,
  )
  const vendorTotal = outstandingVendors.reduce((s, r) => s + (r.amount ?? 0), 0)

  const statusCards = useMemo(() => [
    { label: 'Backdated Balance', color: 'orange', icon: 'Scale', count: formatCurrency(customerBalanceTotal) },
    { label: 'Period Outstanding', color: 'blue', icon: 'CalendarDays', count: formatCurrency(customerOutstandingTotal) },
    { label: 'Total Pending', color: 'violet', icon: 'Users', count: formatCurrency(customerPendingTotal) },
    { label: 'Vendors', color: 'red', icon: 'Building2', count: formatCurrency(vendorTotal) },
  ], [customerBalanceTotal, customerOutstandingTotal, customerPendingTotal, vendorTotal])

  const customerColumns = [
    { key: 'srNo', label: 'Sr. No.', render: (r) => r.srNo ?? '—' },
    { key: 'name', label: 'Customer' },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance ?? 0) },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding ?? r.amount ?? 0) },
    {
      key: 'totalPending',
      label: 'Total Pending',
      render: (r) => formatCurrency(r.totalPending ?? ((r.balance ?? 0) + (r.outstanding ?? r.amount ?? 0))),
    },
  ]

  const agingColumns = (type) => [
    { key: 'name', label: type },
    { key: 'amount', label: 'Outstanding', render: (r) => formatCurrency(r.amount) },
    { key: 'days0_30', label: '0-30 Days', render: (r) => formatCurrency(r.days0_30) },
    { key: 'days30_60', label: '30-60 Days', render: (r) => formatCurrency(r.days30_60) },
    { key: 'days60_90', label: '60-90 Days', render: (r) => formatCurrency(r.days60_90) },
    { key: 'days90plus', label: '90+ Days', render: (r) => formatCurrency(r.days90plus) },
  ]

  const tabs = [
    {
      id: 'customers',
      label: 'Customer Wise',
      content: (
        <ERPDataTable
          columns={customerColumns}
          data={outstandingCustomers}
          showActions={false}
          selectable={false}
        />
      ),
    },
    {
      id: 'vendors',
      label: 'Vendor Wise',
      content: (
        <ERPDataTable
          columns={agingColumns('Vendor')}
          data={outstandingVendors}
          showActions={false}
          selectable={false}
        />
      ),
    },
    {
      id: 'parties',
      label: 'Party Provisions',
      content: (
        <ERPDataTable
          columns={agingColumns('Party')}
          data={outstandingParties}
          showActions={false}
          selectable={false}
        />
      ),
    },
  ]

  return (
    <ERPContentPage module="Accounting" title="Outstanding Report" report>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Customer-wise: <strong>Balance</strong> = backdated pending (before From date),{' '}
        <strong>Outstanding</strong> = pending in the selected date range,{' '}
        <strong>Total Pending</strong> = Balance + Outstanding. Customers with older dues still appear
        even if they have no transaction on the selected dates.
      </p>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <StatusSummaryCards cards={statusCards} />
        <ReportFilterRow
          showCustomer
          showVendor
          value={filters}
          onChange={setFilters}
          onApply={() => setQuery(toReportQuery(filters))}
        />
        <Card className="!p-2.5 sm:!p-3">
          {loading ? <p className="p-4 text-sm text-slate-500">Loading…</p> : <Tabs tabs={tabs} fill />}
        </Card>
      </div>
    </ERPContentPage>
  )
}
