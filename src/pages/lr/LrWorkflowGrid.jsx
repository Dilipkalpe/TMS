import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { lrOperationsApi } from '../../services/api'
import { lrDetailPath, lrEditPath, lrProcessPath } from '../../utils/docPath'
import { lrStatusProgress } from '../../constants/lrStatusFlow'
import { getWorkflowTab } from '../../constants/lrWorkflowTabs'
import { ArrowRight } from 'lucide-react'

export default function LrWorkflowGrid({ stage, filterRow = null }) {
  const navigate = useNavigate()
  const tab = getWorkflowTab(stage)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => {
      const params = buildListParams({ page, pageSize, search })
      return lrOperationsApi.queue(stage, params)
    },
    [stage],
  )

  const openRow = (row) => {
    navigate(lrDetailPath(row.lrNumber))
  }

  const runAction = (e, row) => {
    e.stopPropagation()
    if (row.status === 'Draft') {
      navigate(lrEditPath(row.lrNumber))
    } else if (row.processStep) {
      navigate(lrProcessPath(row.lrNumber, row.processStep))
    } else {
      openRow(row)
    }
  }

  const columns = useMemo(() => {
    const cols = [
      {
        key: 'action',
        label: 'Next Action',
        render: (r) => (
          <Button size="sm" icon={ArrowRight} onClick={(e) => runAction(e, r)}>
            {r.nextAction || tab?.label || 'Continue'}
          </Button>
        ),
      },
      { key: 'lrNumber', label: 'LR No.' },
      { key: 'customer', label: 'Customer', render: (r) => r.customer || '—' },
      { key: 'consignor', label: 'Consignor' },
      { key: 'consignee', label: 'Consignee' },
      { key: 'vehicle', label: 'Vehicle', render: (r) => r.vehicle || '—' },
      {
        key: 'status',
        label: 'Status',
        render: (r) => {
          const status = r.status || 'LR Created'
          return (
            <div className="min-w-[7rem]">
              <Badge variant={statusVariant(status === 'Closed' ? 'Paid' : 'Pending')}>{status}</Badge>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${lrStatusProgress(status)}%` }} />
              </div>
            </div>
          )
        },
      },
      { key: 'lrDate', label: 'Date' },
      { key: 'from', label: 'Route', render: (r) => `${r.from || '—'} → ${r.to || '—'}` },
    ]
    return cols
  }, [tab, navigate, stage])

  const extraRow = filterRow ?? (stage === 'expense-pending' ? (
    <Link to="/lr/expense-approval">
      <Button variant="outline">Admin: Expense Approval</Button>
    </Link>
  ) : null)

  return (
    <ERPListPage
      module="LR Management"
      title={undefined}
      searchPlaceholder="Search LR no., customer, party, vehicle…"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      showAdd={false}
      filterRow={extraRow}
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
      onRowClick={openRow}
      printSubtitle={tab?.label}
      exportFilename={`lr-${stage}`}
    />
  )
}

export function LrWorkflowToolbar({ children }) {
  return children ? <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div> : null
}

export function LrNewButton() {
  return (
    <Link to="/lr/generate">
      <Button>Create LR</Button>
    </Link>
  )
}
