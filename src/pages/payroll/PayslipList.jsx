import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import PayslipPrintFormat from '../../components/print/PayslipPrintFormat'
import { usePrint } from '../../context/PrintContext'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { payrollApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function PayslipList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) =>
      payrollApi.payslips(buildListParams({ page, pageSize, search })),
    [],
  )

  const handlePrint = async (row) => {
    try {
      const slip = await payrollApi.getPayslip(row.entryId)
      print(<PayslipPrintFormat company={company} slip={slip} />)
    } catch (err) {
      toast({ title: 'Print failed', message: err.message, type: 'error' })
    }
  }

  const columns = [
    { key: 'periodLabel', label: 'Period' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'employeeType', label: 'Type' },
    { key: 'grossPay', label: 'Gross', render: (r) => formatCurrency(r.grossPay) },
    { key: 'netPay', label: 'Net Pay', render: (r) => formatCurrency(r.netPay) },
    { key: 'paymentStatus', label: 'Status', render: (r) => <Badge variant={statusVariant(r.paymentStatus)}>{r.paymentStatus}</Badge> },
  ]

  return (
    <ERPListPage
      module="Payroll"
      title="Payslips"
      searchPlaceholder="Employee, period, run code..."
      searchKeys={['employeeName', 'periodLabel', 'employeeId']}
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="periodLabel"
      showActions={false}
      onRowClick={(r) => navigate(`/payroll/payslips/${r.entryId}`)}
      onPrint={handlePrint}
      rowPrintTitle="Print payslip"
      exportFilename="payslips-export.csv"
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
      onServerSearch={paged.setSearch}
      searchValue={paged.search}
    />
  )
}
