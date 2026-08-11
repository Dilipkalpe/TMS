import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ERPContentPage from '../ui/ERPContentPage'
import ERPListPage from '../ui/ERPListPage'
import Button from '../ui/Button'
import Badge, { statusVariant } from '../ui/Badge'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { lrApi, lrOperationsApi, lrProcessApi } from '../../services/api'
import { lrProcessPath } from '../../utils/docPath'
import { gridActionForStage } from '../../constants/lrStatusNavigation'
import { useToast } from '../../context/ToastContext'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import BillingInvoiceFlowBanner from '../billing/BillingInvoiceFlowBanner'

/** CRUD gate: list queue (Read) → select LR → form (Create/Update via lrProcessApi). */
export default function OpsLrQueueGate({
  module,
  title,
  stage,
  queueHint,
  processStep,
  basePath,
  listPath,
  allowBlankEntry = false,
  children,
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const lrNumber = searchParams.get('lr')

  const [ctx, setCtx] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) =>
      lrOperationsApi.queue(stage, buildListParams({ page, pageSize, search })),
    [stage],
  )

  const selectLr = (num) => setSearchParams({ lr: num })

  const clearLr = () => setSearchParams({})

  const reload = useCallback(async () => {
    if (!lrNumber) return
    const [process, lr] = await Promise.all([
      lrProcessApi.get(lrNumber),
      lrApi.get(lrNumber),
    ])
    setCtx({ lrNumber, process, lr })
  }, [lrNumber])

  useEffect(() => {
    if (!lrNumber) {
      setCtx(null)
      return
    }
    let cancelled = false
    setLoading(true)
    reload()
      .catch((e) => { if (!cancelled) toast({ title: 'Load failed', message: e.message, type: 'error' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [lrNumber, reload, toast])

  const runSave = async (label, fn) => {
    setSaving(true)
    try {
      await fn()
      await reload()
      paged.refresh()
      toast({ title: label, type: 'success' })
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const queueColumns = [
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <Button size="sm" icon={ArrowRight} onClick={(e) => { e.stopPropagation(); selectLr(r.lrNumber) }}>
          {gridActionForStage(stage)}
        </Button>
      ),
    },
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'lrDate', label: 'Date' },
    { key: 'customer', label: 'Customer', render: (r) => r.customer || '—' },
    { key: 'consignor', label: 'Consignor' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'vehicle', label: 'Vehicle', render: (r) => r.vehicle || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Badge variant={statusVariant(r.status === 'Closed' ? 'Paid' : 'Pending')}>{r.status}</Badge>,
    },
  ]

  if (!lrNumber) {
    if (allowBlankEntry) {
      return children({
        lrNumber: null,
        process: null,
        lr: null,
        saving,
        runSave,
        reload: async () => {},
        onBack: listPath ? () => navigate(listPath) : clearLr,
        openProcess: () => {},
        basePath,
        isBlank: true,
      })
    }
    return (
      <ERPContentPage module={module} title={title}>
        {module === 'Billing' && <BillingInvoiceFlowBanner currentStep={2} />}
        <div className="mb-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
          {queueHint}
        </div>
        <ERPListPage
          module={module}
          title={`${title} — Select LR`}
          showAdd={false}
          searchPlaceholder="Search LR no., customer, vehicle…"
          columns={queueColumns}
          data={paged.items}
          loading={paged.loading}
          error={paged.error}
          onRowClick={(r) => selectLr(r.lrNumber)}
          onRefreshExternal={paged.refresh}
          serverMode
          serverTotal={paged.total}
          serverHasMore={paged.hasMore}
          totalIsApproximate={paged.totalIsApproximate}
          serverPage={paged.page}
          onServerPageChange={paged.setPage}
          serverPageSize={paged.pageSize}
          onServerPageSizeChange={paged.setPageSize}
          onServerSearch={paged.setSearch}
          exportFilename={`ops-${stage}-queue`}
        />
      </ERPContentPage>
    )
  }

  if (loading || !ctx) {
    return (
      <ERPContentPage module={module} title={title}>
        <p className="p-4 text-sm text-slate-500">Loading {lrNumber}…</p>
      </ERPContentPage>
    )
  }

  return children({
    ...ctx,
    saving,
    runSave,
    reload,
    onBack: listPath ? () => navigate(listPath) : clearLr,
    openProcess: () => navigate(lrProcessPath(lrNumber, processStep)),
    basePath,
  })
}
