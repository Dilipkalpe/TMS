import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'

export default function VendorLedgerReport() {
  const { data, loading, error, refresh } = useApiResource(() => accountingApi.vendorLedger())
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Voucher' },
    { key: 'particular', label: 'Particular' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  return (
    <ERPListPage
      module="Accounting"
      title="Vendor Ledger Report"
      statusCards={registerStatusCards('Total Entries', data.length, 'orange', 'Building2')}
      showActions={false}
      searchPlaceholder="Particular, voucher..."
      searchKeys={['particular', 'voucher']}
      columns={columns}
      data={data}
      sortKey="date"
      loading={loading}
      error={error}
      onRefreshExternal={refresh}
      filterRow={<ReportFilterRow showVendor />}
    />
  )
}
