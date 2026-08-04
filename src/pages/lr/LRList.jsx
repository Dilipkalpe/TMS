import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import LrStatusFlow from '../../components/lr/LrStatusFlow'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { lrApi } from '../../services/api'
import { lrEditPath, lrProcessPath } from '../../utils/docPath'
import { LR_STATUS_STEPS, lrStatusProgress, lrStatusStepIndex } from '../../constants/lrStatusFlow'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import LRPrintFormat from '../../components/print/LRPrintFormat'
import { withAuditColumns } from '../../utils/auditColumns'
import { Workflow } from 'lucide-react'

const STATUS_FILTER_OPTIONS = ['(All)', ...LR_STATUS_STEPS]

export default function LRList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [statusFilter, setStatusFilter] = useState('(All)')

  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) => {
      const params = buildListParams({ page, pageSize, search, filter, filterKey: 'paymentType' })
      if (statusFilter && statusFilter !== '(All)') params.status = statusFilter
      return lrApi.list(params)
    },
    [statusFilter],
  )

  const columns = useMemo(() => withAuditColumns([
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'lrDate', label: 'Date' },
    { key: 'branchName', label: 'Branch', render: (r) => r.branchName || '—' },
    { key: 'consignor', label: 'Consignor' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'vehicle', label: 'Vehicle' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const status = r.status || 'LR Created'
        const step = lrStatusStepIndex(status) + 1
        const pct = lrStatusProgress(status)
        return (
          <div className="min-w-[8rem]">
            <Badge variant={statusVariant(status === 'Closed' ? 'Paid' : 'Pending')}>{status}</Badge>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">Step {step}/{LR_STATUS_STEPS.length}</p>
          </div>
        )
      },
    },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'paymentType', label: 'Payment', render: (r) => <Badge variant={statusVariant(r.paymentType === 'Paid' ? 'Paid' : 'Pending')}>{r.paymentType}</Badge> },
    {
      key: 'process',
      label: 'Flow',
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          icon={Workflow}
          onClick={(e) => {
            e.stopPropagation()
            navigate(lrProcessPath(r.lrNumber))
          }}
        >
          Open
        </Button>
      ),
    },
  ]), [navigate])

  const handleDelete = async (row) => {
    if (!row?.lrNumber) {
      toast({ title: 'Delete failed', message: 'LR number is missing.', type: 'error' })
      return
    }
    if (!window.confirm(`Delete LR ${row.lrNumber}?`)) return
    try {
      await lrApi.remove(row.lrNumber)
      toast({ title: 'Deleted', message: `LR ${row.lrNumber} removed.`, type: 'success' })
      paged.refresh()
    } catch (err) {
      toast({ title: 'Delete failed', message: err.message, type: 'error' })
    }
  }

  const handlePrintLr = async (row) => {
    try {
      const lr = await lrApi.get(row.lrNumber)
      print(<LRPrintFormat lr={lr} company={company} />)
    } catch (err) {
      toast({ title: 'Print failed', message: err.message, type: 'error' })
    }
  }

  return (
    <ERPListPage
      module="LR Management"
      title="LR List"
      statusCards={[{ label: 'Total LR', color: 'violet', icon: 'Files', count: paged.total }]}
      onAdd={() => navigate('/lr/generate')}
      searchPlaceholder="LR No., consignor, route..."
      filterOptions={['(All)', 'To Pay', 'Paid', 'TBB']}
      filterKey="paymentType"
      filterRow={(
        <Card className="border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20">
          <LrStatusFlow highlightCurrent={false} layout="horizontal" />
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-violet-200 pt-3 dark:border-violet-800">
            <div className="min-w-[12rem] flex-1">
              <Select
                label="Filter by LR status"
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/lr/expenses/approval')}>
              Pending expense approvals
            </Button>
          </div>
        </Card>
      )}
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="lrDate"
      onRowClick={(r) => navigate(lrProcessPath(r.lrNumber))}
      onEdit={(r) => navigate(lrEditPath(r.lrNumber))}
      onDelete={handleDelete}
      onPrint={handlePrintLr}
      rowPrintTitle="Print LR"
      exportFilename="lr-export.csv"
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
