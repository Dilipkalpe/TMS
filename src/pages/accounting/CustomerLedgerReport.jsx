import { useCallback, useState } from 'react'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function CustomerLedgerReport() {
  const [filters, setFilters] = useState(defaultReportFilters)
  const [query, setQuery] = useState(() => toReportQuery(defaultReportFilters()))

  const load = useCallback(() => accountingApi.customerLedger(query), [query])
  const { data, loading, error, refresh } = useApiResource(load, [query])

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Voucher' },
    { key: 'particular', label: 'Particular' },
    { key: 'refNo', label: 'Ref No', render: (r) => r.refNo || '-' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  return (
    <ERPListPage
      module="Accounting"
      title="Customer Ledger Report"
      statusCards={registerStatusCards('Total Entries', data.length, 'green', 'Users')}
      showActions={false}
      searchPlaceholder="Particular, voucher..."
      searchKeys={['particular', 'voucher', 'refNo']}
      columns={columns}
      data={data}
      sortKey="date"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      filterRow={(
        <ReportFilterRow
          showCustomer
          value={filters}
          onChange={setFilters}
          onApply={() => setQuery(toReportQuery(filters))}
        />
      )}
    />
  )
}
