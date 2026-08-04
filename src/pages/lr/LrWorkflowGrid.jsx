import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { lrOperationsApi } from '../../services/api'
import { lrDetailPath, lrEditPath, lrProcessPath } from '../../utils/docPath'
import {
  defaultDetailSectionForStatus,
  gridActionForStage,
  lrRowActions,
} from '../../constants/lrStatusNavigation'
import { useAuth } from '../../context/AuthContext'
import { ArrowRight } from 'lucide-react'

export default function LrWorkflowGrid({ stage, stageActionLabel, onChanged }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const stageAction = gridActionForStage(stage)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) =>
      lrOperationsApi.queue(stage, buildListParams({ page, pageSize, search })),
    [stage],
  )

  const openRow = (row) => {
    const section = defaultDetailSectionForStatus(row.status)
    navigate(`${lrDetailPath(row.lrNumber)}?section=${section}`)
  }

  const runPrimaryAction = (e, row) => {
    e.stopPropagation()
    if (row.status === 'Draft') {
      navigate(lrEditPath(row.lrNumber))
      return
    }
    const step = row.processStep || 'loading'
    navigate(lrProcessPath(row.lrNumber, step))
  }

  const runRowAction = (e, row, action) => {
    e.stopPropagation()
    if (action.id === 'view') {
      openRow(row)
      return
    }
    if (action.id === 'edit') {
      navigate(lrEditPath(row.lrNumber))
      return
    }
    if (action.id === 'approve-expense') {
      navigate('/lr/expense-approval')
      return
    }
    const stepMap = {
      'assign-vehicle': 'loading',
      'transit-pass': 'transit',
      dispatch: 'delivery',
      pod: 'delivery',
      invoice: 'invoice',
      expense: 'expense',
      close: 'close',
    }
    navigate(lrProcessPath(row.lrNumber, stepMap[action.id] || row.processStep || 'loading'))
  }

  const columns = useMemo(() => [
    {
      key: 'action',
      label: 'Next Action',
      render: (r) => (
        <Button size="sm" icon={ArrowRight} onClick={(e) => runPrimaryAction(e, r)}>
          {stageAction || r.nextAction || 'Continue'}
        </Button>
      ),
    },
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'customer', label: 'Customer', render: (r) => r.customer || '—' },
    { key: 'consignor', label: 'Consignor' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'vehicle', label: 'Vehicle', render: (r) => r.vehicle || '—' },
    { key: 'lrDate', label: 'Date' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const status = r.status || 'LR Created'
        return (
          <Badge variant={statusVariant(status === 'Closed' ? 'Paid' : 'Pending')}>{status}</Badge>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => {
        const actions = lrRowActions(r.status || 'LR Created', user?.role).filter((a) => a.id !== 'view')
        return (
          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" onClick={(e) => runRowAction(e, r, { id: 'view' })}>View</Button>
            {actions.slice(0, 2).map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.primary ? 'primary' : 'outline'}
                onClick={(e) => runRowAction(e, r, action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )
      },
    },
  ], [stageAction, user?.role, navigate])

  const extraRow = stage === 'expense-pending' ? (
    <Link to="/lr/expense-approval">
      <Button variant="outline">Admin: Expense Approval Queue</Button>
    </Link>
  ) : null

  return (
    <ERPListPage
      module="LR Management"
      title={undefined}
      searchPlaceholder="Search LR no., customer, party, vehicle…"
      showAdd
      addLabel="Create LR"
      addPosition="end"
      onAdd={() => navigate('/lr/generate')}
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
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
      onRefreshExternal={() => { paged.refresh(); onChanged?.() }}
      onRowClick={openRow}
      exportFilename={`lr-${stage}`}
      printSubtitle={stageActionLabel}
    />
  )
}
