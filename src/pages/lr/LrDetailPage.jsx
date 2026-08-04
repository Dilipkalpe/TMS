import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { statusVariant } from '../../components/ui/Badge'
import LrStatusFlow from '../../components/lr/LrStatusFlow'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { lrApi, lrProcessApi } from '../../services/api'
import { fromDocPath, lrEditPath, lrProcessPath } from '../../utils/docPath'
import { LR_WORKFLOW_TABS } from '../../constants/lrWorkflowTabs'
import { lrStatusProgress } from '../../constants/lrStatusFlow'
import { useToast } from '../../context/ToastContext'
import { ArrowLeft, ArrowRight } from 'lucide-react'

function Section({ title, children, empty = 'Not recorded yet' }) {
  return (
    <Card className="p-4">
      <CardHeader title={title} />
      <div className="text-sm text-slate-600 dark:text-slate-300">
        {children || <p className="text-slate-400">{empty}</p>}
      </div>
    </Card>
  )
}

export default function LrDetailPage() {
  const { lrNumber: raw } = useParams()
  const lrNumber = fromDocPath(raw)
  const navigate = useNavigate()
  const { toast } = useToast()
  const [lr, setLr] = useState(null)
  const [process, setProcess] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [lrData, proc] = await Promise.all([
      lrApi.get(lrNumber),
      lrProcessApi.get(lrNumber),
    ])
    setLr(lrData)
    setProcess(proc)
  }, [lrNumber])

  useEffect(() => {
    setLoading(true)
    reload()
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [reload, toast])

  if (loading || !lr) {
    return (
      <ERPContentPage module="LR Management" title={`LR ${lrNumber}`}>
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  const status = process?.status || lr.status || 'LR Created'
  const nextTab = LR_WORKFLOW_TABS.find((t) => {
    if (status === 'Draft' || status === 'LR Created') return t.id === 'loading-pending'
    if (status === 'Loading Completed') return t.id === 'transit-pass'
    if (status === 'Transit Pass Generated') return t.id === 'dispatch'
    if (status === 'In Transit') return t.id === 'delivery'
    if (status === 'Delivery Completed') return t.id === 'pod-pending'
    if (status === 'POD Uploaded') return t.id === 'invoice-pending'
    if (status === 'Invoice Generated' || status === 'Expense Added') return t.id === 'expense-pending'
    return t.id === 'lr-list'
  })

  const processStep = nextTab?.processStep

  return (
    <ERPContentPage
      module="LR Management"
      title={`LR ${lrNumber}`}
      toolbar={(
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/lr')}>Back</Button>
          <Link to={lrEditPath(lrNumber)}>
            <Button variant="outline">Edit LR</Button>
          </Link>
          {processStep && status !== 'Closed' && (
            <Button
              icon={ArrowRight}
              onClick={() => navigate(lrProcessPath(lrNumber, processStep))}
            >
              {nextTab?.label ? `Continue: ${nextTab.label}` : 'Continue workflow'}
            </Button>
          )}
        </div>
      )}
    >
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{lr.from} → {lr.to}</p>
            <p className="text-lg font-semibold">{lr.consignor} → {lr.consignee}</p>
            <p className="text-sm text-slate-500">Vehicle: {lr.vehicle || '—'} · Freight: {formatCurrency(lr.freight)}</p>
          </div>
          <Badge variant={statusVariant(status === 'Closed' ? 'Paid' : 'Pending')}>{status}</Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-violet-600" style={{ width: `${lrStatusProgress(status)}%` }} />
        </div>
        <div className="mt-4">
          <LrStatusFlow currentStatus={status} layout="horizontal" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="LR Information">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div><dt className="text-slate-400">Date</dt><dd>{lr.lrDate}</dd></div>
            <div><dt className="text-slate-400">Branch</dt><dd>{lr.branchName || '—'}</dd></div>
            <div><dt className="text-slate-400">Customer</dt><dd>{lr.customerName || '—'}</dd></div>
            <div><dt className="text-slate-400">Type</dt><dd>{lr.businessType || 'FTL'}</dd></div>
            <div><dt className="text-slate-400">Material</dt><dd>{lr.material || '—'}</dd></div>
            <div><dt className="text-slate-400">Payment</dt><dd>{lr.paymentType}</dd></div>
          </dl>
        </Section>

        <Section title="Consignor & Consignee">
          <p><strong>From:</strong> {lr.consignor} — {lr.from}</p>
          <p className="mt-2"><strong>To:</strong> {lr.consignee} — {lr.to}</p>
        </Section>

        <Section title="Loading Details">
          {process?.loadingSheet ? (
            <>
              <p>Sheet: {process.loadingSheet.sheetNumber}</p>
              <p>Location: {process.loadingSheet.loadingLocation || '—'}</p>
              <p>Qty: {process.loadingSheet.materialQuantity || '—'}</p>
              <p>Status: {process.loadingSheet.loadingStatus}</p>
            </>
          ) : null}
        </Section>

        <Section title="Vehicle & Transit">
          {process?.transitPass ? (
            <>
              <p>Pass: {process.transitPass.passNumber}</p>
              <p>Vehicle: {process.transitPass.vehicleNumber}</p>
              <p>Driver: {process.transitPass.driverName || '—'}</p>
              <p>Route: {process.transitPass.routeFrom} → {process.transitPass.routeTo}</p>
            </>
          ) : (
            <p>Vehicle on LR: {lr.vehicle || '—'} · Driver: {lr.driver || '—'}</p>
          )}
        </Section>

        <Section title="Delivery Details">
          {process?.deliverySheet ? (
            <>
              <p>Status: {process.deliverySheet.shipmentStatus}</p>
              <p>Date: {process.deliverySheet.deliveryDate || '—'}</p>
              <p>Receiver: {process.deliverySheet.receiverName || '—'}</p>
              <p>Location: {process.deliverySheet.deliveryLocation || '—'}</p>
            </>
          ) : null}
          {process?.deliveryDocuments?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {process.deliveryDocuments.map((d) => (
                <li key={d.id}>{d.docType}: {d.title}</li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Invoice">
          {process?.invoice ? (
            <>
              <p>{process.invoice.invoiceNo} — {formatCurrency(process.invoice.totalAmount)}</p>
              <p>Status: {process.invoice.status}</p>
            </>
          ) : null}
        </Section>

        <Section title="Expenses">
          {process?.expenses?.length > 0 ? (
            <ul className="space-y-2">
              {process.expenses.map((e) => (
                <li key={e.id} className="flex justify-between gap-2">
                  <span>{e.category} — {formatCurrency(e.amount)}</span>
                  <Badge variant={statusVariant(e.status === 'Approved' ? 'Paid' : 'Pending')}>{e.status}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      </div>
    </ERPContentPage>
  )
}
