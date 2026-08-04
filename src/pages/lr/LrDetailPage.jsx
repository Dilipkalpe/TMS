import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { statusVariant } from '../../components/ui/Badge'
import LrStatusFlow from '../../components/lr/LrStatusFlow'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { lrApi, lrProcessApi } from '../../services/api'
import { fromDocPath, lrEditPath, lrProcessPath } from '../../utils/docPath'
import {
  LR_DETAIL_SECTIONS,
  defaultDetailSectionForStatus,
  getDetailSection,
} from '../../constants/lrStatusNavigation'
import { lrStatusProgress } from '../../constants/lrStatusFlow'
import { useToast } from '../../context/ToastContext'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function LrDetailPage() {
  const { lrNumber: raw } = useParams()
  const lrNumber = fromDocPath(raw)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const [lr, setLr] = useState(null)
  const [process, setProcess] = useState(null)
  const [statusHistory, setStatusHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [lrData, proc, history] = await Promise.all([
      lrApi.get(lrNumber),
      lrProcessApi.get(lrNumber),
      lrApi.statusHistory(lrNumber).catch(() => ({ items: [] })),
    ])
    setLr(lrData)
    setProcess(proc)
    setStatusHistory(history.items ?? [])
  }, [lrNumber])

  useEffect(() => {
    setLoading(true)
    reload()
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [reload, toast])

  const status = process?.status || lr?.status || 'LR Created'

  const activeSection = useMemo(() => {
    const fromUrl = searchParams.get('section')
    if (fromUrl && getDetailSection(fromUrl)) return fromUrl
    return defaultDetailSectionForStatus(status)
  }, [searchParams, status])

  useEffect(() => {
    if (!searchParams.get('section') && lr) {
      setSearchParams({ section: defaultDetailSectionForStatus(status) }, { replace: true })
    }
  }, [lr, status, searchParams, setSearchParams])

  const sectionMeta = getDetailSection(activeSection)

  if (loading || !lr) {
    return (
      <ERPContentPage module="LR Management" title={`LR ${lrNumber}`}>
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'info':
        return (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="text-slate-400">LR Date</dt><dd className="font-medium">{lr.lrDate}</dd></div>
            <div><dt className="text-slate-400">Branch</dt><dd>{lr.branchName || '—'}</dd></div>
            <div><dt className="text-slate-400">Customer</dt><dd>{lr.customerName || '—'}</dd></div>
            <div><dt className="text-slate-400">Business Type</dt><dd>{lr.businessType || 'FTL'}</dd></div>
            <div><dt className="text-slate-400">Material</dt><dd>{lr.material || '—'}</dd></div>
            <div><dt className="text-slate-400">Quantity</dt><dd>{lr.quantity || '—'}</dd></div>
            <div><dt className="text-slate-400">Freight</dt><dd>{formatCurrency(lr.freight)}</dd></div>
            <div><dt className="text-slate-400">Payment</dt><dd>{lr.paymentType}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-400">Remarks</dt><dd>{lr.remarks || '—'}</dd></div>
          </dl>
        )
      case 'parties':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Consignor</p>
              <p className="text-lg font-medium">{lr.consignor}</p>
              <p className="text-sm text-slate-500">{lr.from}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Consignee</p>
              <p className="text-lg font-medium">{lr.consignee}</p>
              <p className="text-sm text-slate-500">{lr.to}</p>
            </div>
          </div>
        )
      case 'loading':
        return process?.loadingSheet ? (
          <div className="space-y-2">
            <p><strong>Sheet No:</strong> {process.loadingSheet.sheetNumber}</p>
            <p><strong>Location:</strong> {process.loadingSheet.loadingLocation || '—'}</p>
            <p><strong>Quantity:</strong> {process.loadingSheet.materialQuantity || '—'}</p>
            <p><strong>Status:</strong> {process.loadingSheet.loadingStatus}</p>
            {process.loadingSheet.items?.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {process.loadingSheet.items.map((i) => (
                  <li key={i.lrNumber}>{i.lrNumber} · {i.quantityText || '—'}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-slate-500">No loading sheet yet. Use the action below to create one.</p>
        )
      case 'vehicle':
        return (
          <div className="space-y-2">
            <p><strong>Vehicle:</strong> {lr.vehicle || process?.transitPass?.vehicleNumber || '—'}</p>
            <p><strong>Driver:</strong> {lr.driver || process?.transitPass?.driverName || '—'}</p>
            <p className="text-sm text-slate-500">Assign or update vehicle on the loading / transit pass step.</p>
          </div>
        )
      case 'transit':
        return process?.transitPass ? (
          <div className="space-y-2">
            <p><strong>Pass No:</strong> {process.transitPass.passNumber}</p>
            <p><strong>Route:</strong> {process.transitPass.routeFrom} → {process.transitPass.routeTo}</p>
            <p><strong>Vehicle:</strong> {process.transitPass.vehicleNumber}</p>
            <p><strong>Driver:</strong> {process.transitPass.driverName || '—'}</p>
          </div>
        ) : (
          <p className="text-slate-500">Transit pass not generated yet.</p>
        )
      case 'dispatch':
        return (
          <div className="space-y-2">
            <p><strong>Shipment status:</strong> {process?.deliverySheet?.shipmentStatus || (status === 'In Transit' ? 'In Transit' : '—')}</p>
            <p className="text-sm text-slate-500">Dispatch the vehicle after transit pass is generated.</p>
          </div>
        )
      case 'delivery':
        return process?.deliverySheet ? (
          <div className="space-y-2">
            <p><strong>Status:</strong> {process.deliverySheet.shipmentStatus}</p>
            <p><strong>Delivery date:</strong> {process.deliverySheet.deliveryDate || '—'}</p>
            <p><strong>Receiver:</strong> {process.deliverySheet.receiverName || '—'}</p>
            <p><strong>Location:</strong> {process.deliverySheet.deliveryLocation || '—'}</p>
          </div>
        ) : (
          <p className="text-slate-500">Delivery not confirmed yet.</p>
        )
      case 'pod':
        return process?.deliveryDocuments?.length > 0 ? (
          <ul className="space-y-2">
            {process.deliveryDocuments.map((d) => (
              <li key={d.id} className="flex justify-between gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <span>{d.docType}: {d.title}</span>
                {d.fileUrl && (
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">View</a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">No POD / delivery documents uploaded.</p>
        )
      case 'invoice':
        return process?.invoice ? (
          <div className="space-y-2">
            <p><strong>Invoice:</strong> {process.invoice.invoiceNo}</p>
            <p><strong>Amount:</strong> {formatCurrency(process.invoice.totalAmount)}</p>
            <p><strong>Balance:</strong> {formatCurrency(process.invoice.balance)}</p>
            <p><strong>Status:</strong> {process.invoice.status}</p>
          </div>
        ) : (
          <p className="text-slate-500">Freight invoice not generated.</p>
        )
      case 'expenses':
        return (
          <div className="space-y-3">
            {process?.expenses?.length > 0 ? (
              <ul className="space-y-2">
                {process.expenses.map((e) => (
                  <li key={e.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{e.category} — {formatCurrency(e.amount)}</span>
                      <Badge variant={statusVariant(e.status === 'Approved' ? 'Paid' : 'Pending')}>{e.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{e.description || '—'}</p>
                    {e.attachmentUrl && (
                      <a href={e.attachmentUrl} target="_blank" rel="noreferrer" className="text-sm text-violet-600 hover:underline">Attachment</a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No expenses recorded for this LR.</p>
            )}
            <Link to="/lr/expense-approval" className="text-sm text-violet-600 hover:underline">
              Open admin expense approval queue →
            </Link>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <ERPContentPage
      module="LR Management"
      title={`LR ${lrNumber}`}
      toolbar={(
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/lr')}>Back to LR Management</Button>
          {activeSection === 'info' && (
            <Link to={lrEditPath(lrNumber)}>
              <Button variant="outline">Edit LR</Button>
            </Link>
          )}
          {sectionMeta?.processStep && status !== 'Closed' && (
            <Button
              icon={ArrowRight}
              onClick={() => navigate(lrProcessPath(lrNumber, sectionMeta.processStep))}
            >
              {activeSection === 'loading' ? 'Create / Update Loading' :
                activeSection === 'transit' ? 'Generate Transit Pass' :
                activeSection === 'dispatch' ? 'Dispatch Vehicle' :
                activeSection === 'delivery' ? 'Confirm Delivery' :
                activeSection === 'pod' ? 'Upload POD' :
                activeSection === 'invoice' ? 'Generate Invoice' :
                activeSection === 'expenses' ? 'Add / Manage Expenses' : 'Continue'}
            </Button>
          )}
        </div>
      )}
    >
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-slate-500">LR Number</p><p className="font-semibold">{lrNumber}</p></div>
          <div><p className="text-xs text-slate-500">Customer</p><p className="font-medium">{lr.customerName || '—'}</p></div>
          <div><p className="text-xs text-slate-500">Vehicle</p><p className="font-medium">{lr.vehicle || process?.loadingSheet?.vehicleNumber || '—'}</p></div>
          <div><p className="text-xs text-slate-500">Transporter / Driver</p><p className="font-medium">{lr.driver || '—'}</p></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div>
            <p className="text-sm text-slate-500">{lr.from} → {lr.to}</p>
            <p className="font-semibold">{lr.consignor} → {lr.consignee}</p>
          </div>
          <Badge variant={statusVariant(status === 'Closed' ? 'Paid' : 'Pending')}>{status}</Badge>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-violet-600" style={{ width: `${lrStatusProgress(status)}%` }} />
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <CardHeader title="LR Timeline" />
        <ol className="mt-3 space-y-3 border-l-2 border-violet-200 pl-4 dark:border-violet-900">
          {statusHistory.map((item, idx) => (
            <li key={`${item.newStatus}-${idx}`} className="relative">
              <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-violet-500" />
              <p className="font-medium text-slate-800 dark:text-slate-100">{item.newStatus}</p>
              <p className="text-xs text-slate-500">
                {item.changedAt ? new Date(item.changedAt).toLocaleString() : '—'}
                {item.changedBy ? ` · ${item.changedBy}` : ''}
              </p>
              {item.remarks && <p className="text-sm text-slate-600 dark:text-slate-300">{item.remarks}</p>}
            </li>
          ))}
        </ol>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {LR_DETAIL_SECTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setSearchParams({ section: sec.id })}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeSection === sec.id
                ? 'border-violet-600 bg-violet-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <CardHeader title={sectionMeta?.label ?? 'Details'} />
        <div className="text-sm text-slate-700 dark:text-slate-200">
          {renderSectionContent()}
        </div>
      </Card>
    </ERPContentPage>
  )
}
