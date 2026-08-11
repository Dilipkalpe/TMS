import { useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as Icons from 'lucide-react'
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

const WORKFLOW_ACTION_ICONS = {
  view: Icons.Eye,
  edit: Icons.Pencil,
  'assign-vehicle': Icons.Truck,
  'transit-pass': Icons.FileText,
  dispatch: Icons.Send,
  pod: Icons.Upload,
  invoice: Icons.Receipt,
  expense: Icons.Wallet,
  'approve-expense': Icons.CheckCircle,
  close: Icons.CheckCircle2,
  cancel: Icons.XCircle,
}

export default function LrWorkflowGrid({ stage, stageActionLabel, onChanged }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const stageAction = gridActionForStage(stage)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) =>
      lrOperationsApi.queue(stage, buildListParams({ page, pageSize, search })),
    [stage],
  )

  const openRow = useCallback((row) => {
    const section = defaultDetailSectionForStatus(row.status)
    navigate(`${lrDetailPath(row.lrNumber)}?section=${section}`)
  }, [navigate])

  const runPrimaryAction = useCallback((row) => {
    if (row.status === 'Draft') {
      navigate(lrEditPath(row.lrNumber))
      return
    }
    const step = row.processStep || 'loading'
    navigate(lrProcessPath(row.lrNumber, step))
  }, [navigate])

  const runRowAction = useCallback((row, action) => {
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
  }, [navigate, openRow])

  const rowActions = useCallback((row) => {
    const actions = lrRowActions(row.status || 'LR Created', user?.role)
    return actions.map((action) => ({
      id: action.id,
      icon: WORKFLOW_ACTION_ICONS[action.id] || Icons.Circle,
      label: action.label,
      onClick: (r) => runRowAction(r, action),
      variant: action.danger ? 'danger' : action.primary ? 'primary' : 'outline',
    }))
  }, [user?.role, runRowAction])

  const columns = useMemo(() => [
    {
      key: 'action',
      label: 'Next Action',
      render: (r) => {
        const label = stageAction || r.nextAction || 'Continue'
        return (
          <button
            type="button"
            title={label}
            aria-label={label}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-primary/40 bg-white text-primary hover:bg-primary/10 dark:bg-slate-800"
            onClick={(e) => { e.stopPropagation(); runPrimaryAction(r) }}
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        )
      },
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
  ], [stageAction, runPrimaryAction])

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
      onView={openRow}
      rowActions={rowActions}
      getRowKey={(row) => row.lrNumber}
      exportFilename={`lr-${stage}`}
      printSubtitle={stageActionLabel}
    />
  )
}
