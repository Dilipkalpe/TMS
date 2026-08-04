import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ERPListPage from '../../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { formatCurrency } from '../../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../../hooks/usePagedApiResource'
import { lrOperationsApi } from '../../../services/api'
import { lrEditPath, lrProcessPath } from '../../../utils/docPath'
import { lrStatusProgress } from '../../../constants/lrStatusFlow'
import { getOperationMenu } from '../../../constants/lrOperationsMenus'
import { ArrowRight, FileText, Plus } from 'lucide-react'

export default function LrOperationQueuePage({ stage }) {
  const navigate = useNavigate()
  const menu = getOperationMenu(stage)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => {
      const params = buildListParams({ page, pageSize, search })
      return lrOperationsApi.queue(stage, params)
    },
    [stage],
  )

  const columns = useMemo(() => [
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'lrDate', label: 'Date' },
    { key: 'branchName', label: 'Branch', render: (r) => r.branchName || '—' },
    { key: 'consignor', label: 'Consignor' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'from', label: 'Route', render: (r) => `${r.from || '—'} → ${r.to || '—'}` },
    { key: 'vehicle', label: 'Vehicle' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const status = r.status || 'LR Created'
        const pct = lrStatusProgress(status)
        return (
          <div className="min-w-[7rem]">
            <Badge variant={statusVariant(status === 'Closed' ? 'Paid' : 'Pending')}>{status}</Badge>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    {
      key: 'action',
      label: 'Next action',
      render: (r) => (
        <Button
          size="sm"
          icon={ArrowRight}
          onClick={(e) => {
            e.stopPropagation()
            if (stage === 'lr-management' && r.status === 'Draft') {
              navigate(lrEditPath(r.lrNumber))
            } else if (r.processStep) {
              navigate(lrProcessPath(r.lrNumber, r.processStep))
            } else {
              navigate(lrEditPath(r.lrNumber))
            }
          }}
        >
          {r.nextAction || menu?.description || 'Continue'}
        </Button>
      ),
    },
  ], [navigate, stage, menu])

  const toolbarExtra = stage === 'lr-management' ? (
    <Link to="/lr/generate">
      <Button icon={Plus}>New LR</Button>
    </Link>
  ) : (
    <Link to="/operations">
      <Button variant="outline" icon={FileText}>All desks</Button>
    </Link>
  )

  return (
    <ERPListPage
      module="Operations"
      title={menu?.title ?? 'LR Queue'}
      searchPlaceholder="Search LR number, party, route, vehicle…"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      showAdd={false}
      filterRow={toolbarExtra}
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
      onServerSearch={paged.setSearch}
      onRefreshExternal={paged.refresh}
      onRowClick={(row) => {
        if (stage === 'lr-management' && row.status === 'Draft') {
          navigate(lrEditPath(row.lrNumber))
        } else if (row.processStep) {
          navigate(lrProcessPath(row.lrNumber, row.processStep))
        } else {
          navigate(lrProcessPath(row.lrNumber))
        }
      }}
      printSubtitle={`Pending ${menu?.title ?? stage}`}
      exportFilename={`lr-${stage}-queue`}
    />
  )
}
