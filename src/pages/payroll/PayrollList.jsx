import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { useApiObject } from '../../hooks/useApiResource'
import { payrollApi } from '../../services/api'

const statusCards = (summary) => {
  if (!summary) return []
  return [
    { label: 'Total Runs', color: 'blue', icon: 'Layers', count: summary.totalRuns ?? 0 },
    { label: 'Draft', color: 'amber', icon: 'FileEdit', count: summary.draftRuns ?? 0 },
    { label: 'Processed', color: 'violet', icon: 'Clock', count: summary.processedRuns ?? 0 },
    { label: 'Paid Amount', color: 'green', icon: 'IndianRupee', count: formatCurrency(summary.totalPaidAmount ?? 0) },
  ]
}

export default function PayrollList() {
  const navigate = useNavigate()
  const { data: summary } = useApiObject(() => payrollApi.summary(), [])
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      payrollApi.runs(buildListParams({ page, pageSize, search, filter, filterKey: 'status' })),
    [],
  )

  const columns = [
    { key: 'runCode', label: 'Run Code' },
    { key: 'periodLabel', label: 'Period' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>, printValue: (r) => r.status },
    { key: 'entryCount', label: 'Employees' },
    { key: 'totalGross', label: 'Gross', render: (r) => formatCurrency(r.totalGross) },
    { key: 'totalDeductions', label: 'Deductions', render: (r) => formatCurrency(r.totalDeductions) },
    { key: 'totalNet', label: 'Net Pay', render: (r) => formatCurrency(r.totalNet) },
    { key: 'voucherNo', label: 'Voucher' },
    { key: 'paymentMode', label: 'Payment Mode' },
  ]

  return (
    <ERPListPage
      module="Payroll"
      title="Payroll Runs"
      statusCards={statusCards(summary)}
      onAdd={() => navigate('/payroll/generate')}
      addLabel="Generate Payroll"
      searchPlaceholder="Run code, period..."
      searchKeys={['runCode', 'periodLabel', 'status']}
      filterOptions={['(All)', 'Draft', 'Processed', 'Paid', 'Cancelled']}
      filterKey="status"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="periodLabel"
      showActions={false}
      onRowClick={(r) => navigate(`/payroll/runs/${r.id}`)}
      exportFilename="payroll-runs.csv"
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
      onServerSearch={paged.setSearch}
      onServerFilter={paged.setFilter}
      searchValue={paged.search}
    />
  )
}
