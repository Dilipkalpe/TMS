import { useCallback, useState } from 'react'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function LedgerReport() {
  const [filters, setFilters] = useState(defaultReportFilters)
  const [query, setQuery] = useState(() => toReportQuery(defaultReportFilters()))

  const load = useCallback(() => accountingApi.ledgerReport(query), [query])
  const { data, loading, error, refresh } = useApiResource(load, [query])

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'particular', label: 'Particular' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  return (
    <ERPListPage
      module="Accounting"
      title="Ledger Report"
      statusCards={registerStatusCards('Total Entries', data.length, 'blue', 'BookOpen')}
      showActions={false}
      searchPlaceholder="Particular, voucher no..."
      searchKeys={['particular', 'voucherNo']}
      columns={columns}
      data={data}
      sortKey="date"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      filterRow={(
        <ReportFilterRow
          value={filters}
          onChange={setFilters}
          onApply={() => setQuery(toReportQuery(filters))}
        />
      )}
    />
  )
}
