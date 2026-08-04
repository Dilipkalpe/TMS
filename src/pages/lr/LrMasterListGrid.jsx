import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { lrApi } from '../../services/api'
import { lrDetailPath, lrEditPath, lrProcessPath } from '../../utils/docPath'
import {
  defaultDetailSectionForStatus,
  lrRowActions,
  stageLabelForStatus,
} from '../../constants/lrStatusNavigation'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import { useAuth } from '../../context/AuthContext'
import LRPrintFormat from '../../components/print/LRPrintFormat'
import { withAuditColumns } from '../../utils/auditColumns'

export default function LrMasterListGrid({ onChanged }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const { user } = useAuth()

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) =>
      lrApi.list(buildListParams({ page, pageSize, search })),
    [],
  )

  const runAction = (e, row, action) => {
    e.stopPropagation()
    if (action.id === 'cancel') {
      handleDelete(row)
      return
    }
    if (action.id === 'view') {
      navigate(`${lrDetailPath(row.lrNumber)}?section=${defaultDetailSectionForStatus(row.status)}`)
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
    navigate(lrProcessPath(row.lrNumber, stepMap[action.id] || 'loading'))
  }

  const handleDelete = async (row) => {
    if (!row?.lrNumber) return
    if (!window.confirm(`Cancel / delete LR ${row.lrNumber}?`)) return
    try {
      await lrApi.remove(row.lrNumber)
      toast({ title: 'LR removed', message: `LR ${row.lrNumber} cancelled.`, type: 'success' })
      paged.refresh()
      onChanged?.()
    } catch (err) {
      toast({ title: 'Action failed', message: err.message, type: 'error' })
    }
  }

  const handlePrintLr = async (e, row) => {
    e.stopPropagation()
    try {
      const lr = await lrApi.get(row.lrNumber)
      print(<LRPrintFormat lr={lr} company={company} />)
    } catch (err) {
      toast({ title: 'Print failed', message: err.message, type: 'error' })
    }
  }

  const columns = useMemo(() => withAuditColumns([
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'lrDate', label: 'LR Date' },
    { key: 'customerName', label: 'Customer', render: (r) => r.customerName || '—' },
    { key: 'consignor', label: 'Consignor' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'vehicle', label: 'Vehicle No.', render: (r) => r.vehicle || '—' },
    { key: 'driver', label: 'Transporter', render: (r) => r.driver || '—' },
    { key: 'businessType', label: 'Loading Type', render: (r) => <Badge variant="outline">{r.businessType || 'FTL'}</Badge> },
    { key: 'from', label: 'From Location' },
    { key: 'to', label: 'To Location' },
    {
      key: 'status',
      label: 'Current Status',
      render: (r) => {
        const status = r.status || 'LR Created'
        return <Badge variant={statusVariant(status === 'Closed' ? 'Paid' : 'Pending')}>{status}</Badge>
      },
    },
    {
      key: 'stage',
      label: 'Current Stage',
      render: (r) => stageLabelForStatus(r.status || 'LR Created'),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (r) => {
        const actions = lrRowActions(r.status || 'LR Created', user?.role)
        return (
          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
            {actions.slice(0, 3).map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.danger ? 'danger' : action.primary ? 'primary' : 'outline'}
                onClick={(e) => runAction(e, r, { ...action, processStep: 'loading' })}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )
      },
    },
  ]), [user?.role, navigate])

  return (
    <ERPListPage
      module="LR Management"
      title={undefined}
      showAdd
      addLabel="Create LR"
      onAdd={() => navigate('/lr/generate')}
      addPosition="end"
      searchPlaceholder="Search LR No. / Customer / Vehicle…"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={() => { paged.refresh(); onChanged?.() }}
      onRowClick={(r) => navigate(`${lrDetailPath(r.lrNumber)}?section=${defaultDetailSectionForStatus(r.status)}`)}
      onEdit={(r) => navigate(lrEditPath(r.lrNumber))}
      onDelete={handleDelete}
      onPrint={(r) => handlePrintLr({ stopPropagation: () => {} }, r)}
      rowPrintTitle="Print LR"
      exportFilename="lr-master-list"
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
      onServerSearch={paged.setSearch}
      sortKey="lrDate"
    />
  )
}
