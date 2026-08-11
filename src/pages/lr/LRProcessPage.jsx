import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Input, { Select, Textarea } from '../../components/ui/Input'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { lrApi, lrProcessApi, lrBusinessApi } from '../../services/api'
import { LR_BUSINESS_TYPE_LABELS } from '../../constants/lrBusinessTypes'
import { fromDocPath, lrEditPath } from '../../utils/docPath'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import LrStatusFlow from '../../components/lr/LrStatusFlow'
import { lrStatusProgress } from '../../constants/lrStatusFlow'
import {
  ArrowLeft, CheckCircle2, FileText, Loader2, Printer, Receipt, Truck, Upload,
} from 'lucide-react'

const DOC_TYPES = ['POD', 'Signed LR', 'Delivery Confirmation', 'Supporting Document']
const SHIPMENT_STATUSES = ['In Transit', 'Delivered', 'POD Received', 'Closed']

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'

const STEP_SECTION_IDS = {
  loading: 'step-loading',
  transit: 'step-transit',
  delivery: 'step-delivery',
  invoice: 'step-invoice',
  expense: 'step-expense',
  close: 'step-close',
}

export default function LRProcessPage() {
  const { lrNumber: rawLrNumber } = useParams()
  const lrNumber = fromDocPath(rawLrNumber)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusStep = searchParams.get('step')
  const { toast } = useToast()
  const { company, print } = usePrint()

  const [process, setProcess] = useState(null)
  const [lr, setLr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [loadingForm, setLoadingForm] = useState({ loadingLocation: '', materialQuantity: '', loadingStatus: 'Completed', remarks: '' })
  const [selectedLrNumbers, setSelectedLrNumbers] = useState([])
  const [eligibleLrs, setEligibleLrs] = useState([])
  const [capacityInfo, setCapacityInfo] = useState(null)
  const [transitForm, setTransitForm] = useState({ viaPoints: '', remarks: '' })
  const [docForm, setDocForm] = useState({ docType: 'POD', title: '', file: null })
  const [deliveryForm, setDeliveryForm] = useState({ shipmentStatus: 'In Transit', deliveryDate: '', deliveryLocation: '', receiverName: '', remarks: '' })
  const [expenseForm, setExpenseForm] = useState({ category: 'Diesel', amount: '', description: '', file: null })
  const [rejectRemarks, setRejectRemarks] = useState({})

  const reload = useCallback(async () => {
    const [proc, lrData] = await Promise.all([
      lrProcessApi.get(lrNumber),
      lrApi.get(lrNumber),
    ])
    setProcess(proc)
    setLr(lrData)
    if (proc.loadingSheet) {
      setLoadingForm({
        loadingLocation: proc.loadingSheet.loadingLocation ?? '',
        materialQuantity: proc.loadingSheet.materialQuantity ?? lrData.quantity ?? '',
        loadingStatus: proc.loadingSheet.loadingStatus ?? 'Completed',
        remarks: proc.loadingSheet.remarks ?? '',
      })
      setSelectedLrNumbers(proc.loadingSheet.items?.map((i) => i.lrNumber) ?? [lrNumber])
    } else {
      setLoadingForm((f) => ({ ...f, materialQuantity: lrData.quantity ?? '', loadingLocation: lrData.from ?? '' }))
      setSelectedLrNumbers([lrNumber])
    }
    if (proc.deliverySheet) {
      setDeliveryForm({
        shipmentStatus: proc.deliverySheet.shipmentStatus ?? 'In Transit',
        deliveryDate: proc.deliverySheet.deliveryDate ?? '',
        deliveryLocation: proc.deliverySheet.deliveryLocation ?? lrData.to ?? '',
        receiverName: proc.deliverySheet.receiverName ?? lrData.consignee ?? '',
        remarks: proc.deliverySheet.remarks ?? '',
      })
    } else {
      setDeliveryForm((f) => ({
        ...f,
        deliveryLocation: lrData.to ?? '',
        receiverName: lrData.consignee ?? '',
      }))
    }
  }, [lrNumber])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    reload()
      .catch((e) => { if (!cancelled) toast({ title: 'Load failed', message: e.message, type: 'error' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reload, toast])

  useEffect(() => {
    if (!process?.businessType || !lrNumber) return
    lrBusinessApi.eligibleForLoading({
      businessType: process.businessType,
      anchorLr: lrNumber,
      vehicleId: lr?.vehicle,
    })
      .then((res) => {
        setEligibleLrs(res.items ?? [])
        setCapacityInfo(res.vehicleCapacityTons != null ? { limit: res.vehicleCapacityTons } : null)
      })
      .catch(() => {})
  }, [process?.businessType, lrNumber, lr?.vehicle])

  useEffect(() => {
    if (!focusStep || loading) return
    const id = STEP_SECTION_IDS[focusStep]
    const el = id ? document.getElementById(id) : null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focusStep, loading, process?.status])

  const sectionClass = (step) =>
    focusStep === step
      ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-900'
      : ''

  const toggleLrSelection = (num) => {
    setSelectedLrNumbers((prev) => {
      if (prev.includes(num)) {
        if (num === lrNumber) return prev
        return prev.filter((x) => x !== num)
      }
      return [...prev, num]
    })
  }

  const runValidateLoading = async () => {
    try {
      const v = await lrProcessApi.validateLoadingSheet(lrNumber, {
        businessType: process.businessType,
        lrNumbers: selectedLrNumbers,
        vehicleNumber: lr?.vehicle,
      })
      setCapacityInfo({
        limit: v.capacityLimitTons,
        used: v.totalQuantityTons,
        ok: v.ok,
        error: v.error,
      })
      if (!v.ok && v.error) toast({ title: 'Validation', message: v.error, type: 'warning' })
    } catch (err) {
      toast({ title: 'Validation failed', message: err.message, type: 'error' })
    }
  }

  const run = async (label, fn) => {
    setSaving(true)
    try {
      await fn()
      await reload()
      toast({ title: label, type: 'success' })
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const saveLoadingSheet = () => run('Loading sheet saved', () =>
    lrProcessApi.saveLoadingSheet(lrNumber, {
      ...loadingForm,
      businessType: process.businessType,
      lrNumbers: selectedLrNumbers,
      vehicleNumber: lr?.vehicle,
      loadingAt: new Date().toISOString(),
    }))

  const createTransitPass = () => run('Transit pass generated', () =>
    lrProcessApi.createTransitPass(lrNumber, transitForm))

  const printTransitPass = () => {
    if (!process?.transitPass) return
    printModuleDocument({
      moduleCode: PRINT_MODULE_CODES.TRANSIT_PASS,
      company,
      print,
      documentData: {
        pass: process.transitPass,
        lr,
        loadingItems: process.loadingSheet?.items,
      },
    })
  }

  const uploadDocument = () => run('Document uploaded', async () => {
    if (!docForm.file) throw new Error('Select a file to upload.')
    if (!docForm.title.trim()) throw new Error('Document title is required.')
    await lrProcessApi.uploadDeliveryDocument(lrNumber, docForm.file, docForm.docType, docForm.title)
    setDocForm({ docType: 'POD', title: '', file: null })
  })

  const saveDeliverySheet = () => run('Delivery sheet saved', () =>
    lrProcessApi.saveDeliverySheet(lrNumber, deliveryForm))

  const addExpense = () => run('Expense added', async () => {
    if (!Number(expenseForm.amount)) throw new Error('Expense amount is required.')
    const exp = await lrProcessApi.addExpense(lrNumber, {
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      description: expenseForm.description,
    })
    if (expenseForm.file) {
      await lrProcessApi.uploadExpenseAttachment(lrNumber, exp.id, expenseForm.file)
    }
    setExpenseForm({ category: 'Diesel', amount: '', description: '', file: null })
  })

  const createInvoice = () => run('Invoice created', () =>
    lrProcessApi.createInvoice(lrNumber, { billType: 'FC' }))

  const closeLr = () => run('LR closed', () => lrProcessApi.close(lrNumber))

  const approveExpense = (expenseId) => run('Expense approved', () =>
    lrProcessApi.approveExpense(lrNumber, expenseId))

  const rejectExpense = (expenseId) => run('Expense rejected', () => {
    const remarks = rejectRemarks[expenseId]
    if (!remarks?.trim()) throw new Error('Rejection remarks are required.')
    return lrProcessApi.rejectExpense(lrNumber, expenseId, remarks)
  })

  if (loading || !process || !lr) {
    return (
      <ERPContentPage module="LR" title="LR Process">
        <p className="text-sm text-slate-500">Loading workflow…</p>
      </ERPContentPage>
    )
  }

  const progress = lrStatusProgress(process.status)

  return (
    <ERPContentPage
      module="LR"
      title={`LR Process — ${lrNumber}`}
      toolbar={(
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/operations')}>Operations desks</Button>
          <Button variant="outline" onClick={() => navigate('/lr/list')}>All LRs</Button>
          <Link to={lrEditPath(lrNumber)}>
            <Button variant="outline" icon={FileText}>Edit LR</Button>
          </Link>
        </div>
      )}
    >
      <Card className="mb-4 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{lr.from} → {lr.to} · {lr.vehicle}</p>
            <p className="text-lg font-semibold">{lr.consignor} → {lr.consignee}</p>
          </div>
          <Badge variant={statusVariant(process.status === 'Closed' ? 'Paid' : 'Pending')} className="text-sm">
            {process.status || 'LR Created'}
          </Badge>
          <Badge variant="outline" className="text-sm">{process.businessType || 'FTL'}</Badge>
        </div>
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <LrStatusFlow currentStatus={process.status} layout="horizontal" />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="step-loading" className={sectionClass('loading')}>
          <CardHeader
            title="2. Loading Sheet"
            subtitle={
              process.businessType === 'PTL'
                ? 'Select multiple LRs · capacity check required'
                : 'Same-customer LRs can share one sheet (FTL)'
            }
          />
          <div className="space-y-3 p-4 pt-0">
            <p className="text-xs text-slate-500">
              {LR_BUSINESS_TYPE_LABELS[process.businessType] || LR_BUSINESS_TYPE_LABELS.FTL}
            </p>
            {(process.businessType === 'PTL' || eligibleLrs.length > 1) && (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-sm font-medium">LRs on this loading sheet</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                  {[lrNumber, ...eligibleLrs.map((e) => e.lrNumber).filter((n) => n !== lrNumber)]
                    .filter((n, i, a) => a.indexOf(n) === i)
                    .map((num) => (
                      <li key={num} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedLrNumbers.includes(num)}
                          disabled={num === lrNumber}
                          onChange={() => toggleLrSelection(num)}
                        />
                        <span>{num}{num === lrNumber ? ' (current)' : ''}</span>
                      </li>
                    ))}
                </ul>
                <Button size="sm" variant="outline" className="mt-2" onClick={runValidateLoading}>
                  Validate capacity
                </Button>
                {capacityInfo && (
                  <p className={`mt-2 text-xs ${capacityInfo.ok === false ? 'text-red-600' : 'text-slate-600'}`}>
                    Load: {capacityInfo.used ?? '—'} MT
                    {capacityInfo.limit != null ? ` / ${capacityInfo.limit} MT capacity` : ''}
                    {capacityInfo.error ? ` — ${capacityInfo.error}` : ''}
                  </p>
                )}
              </div>
            )}
            {process.loadingSheet?.items?.length > 0 && (
              <ul className="text-sm text-slate-600">
                {process.loadingSheet.items.map((i) => (
                  <li key={i.lrNumber}>{i.lrNumber} · {i.customerName || '—'} · {i.quantityText || '—'}</li>
                ))}
              </ul>
            )}
            <Input label="Loading Location" value={loadingForm.loadingLocation} onChange={(e) => setLoadingForm({ ...loadingForm, loadingLocation: e.target.value })} />
            <Input label="Material Quantity" value={loadingForm.materialQuantity} onChange={(e) => setLoadingForm({ ...loadingForm, materialQuantity: e.target.value })} />
            <Select label="Loading Status" options={['Pending', 'In Progress', 'Completed']} value={loadingForm.loadingStatus} onChange={(e) => setLoadingForm({ ...loadingForm, loadingStatus: e.target.value })} />
            <Textarea label="Remarks" value={loadingForm.remarks} onChange={(e) => setLoadingForm({ ...loadingForm, remarks: e.target.value })} />
            <Button icon={saving ? Loader2 : CheckCircle2} disabled={saving} onClick={saveLoadingSheet}>
              {process.loadingSheet ? 'Update Loading Sheet' : 'Create Loading Sheet'}
            </Button>
          </div>
        </Card>

        <Card id="step-transit" className={sectionClass('transit')}>
          <CardHeader title="3. Transit Pass / Memo" subtitle={process.transitPass ? process.transitPass.passNumber : 'After loading completed'} />
          <div className="space-y-3 p-4 pt-0">
            {process.transitPass ? (
              <>
                <p className="text-sm">Route: {process.transitPass.routeFrom} → {process.transitPass.routeTo}</p>
                <p className="text-sm">Vehicle: {process.transitPass.vehicleNumber} · Driver: {process.transitPass.driverName}</p>
                <Button icon={Printer} variant="outline" onClick={printTransitPass}>Print Transit Pass</Button>
              </>
            ) : (
              <>
                <Input label="Via Points (optional)" value={transitForm.viaPoints} onChange={(e) => setTransitForm({ ...transitForm, viaPoints: e.target.value })} />
                <Textarea label="Remarks" value={transitForm.remarks} onChange={(e) => setTransitForm({ ...transitForm, remarks: e.target.value })} />
                <Button icon={saving ? Loader2 : Truck} disabled={saving} onClick={createTransitPass}>Generate Transit Pass</Button>
              </>
            )}
          </div>
        </Card>

        <Card id="step-delivery-docs" className={sectionClass('delivery')}>
          <CardHeader title="4. Delivery Documents" subtitle="POD, signed LR, confirmations" />
          <div className="space-y-3 p-4 pt-0">
            <Select label="Document Type" options={DOC_TYPES} value={docForm.docType} onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })} />
            <Input label="Title" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className={inputClass} onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] ?? null })} />
            <Button icon={Upload} disabled={saving} onClick={uploadDocument}>Upload Document</Button>
            {process.deliveryDocuments?.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {process.deliveryDocuments.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2">
                    <span>{d.docType}: {d.title}</span>
                    {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">View</a>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card id="step-delivery" className={sectionClass('delivery')}>
          <CardHeader title="5. Delivery Sheet" subtitle={process.deliverySheet ? process.deliverySheet.sheetNumber : 'Update shipment status'} />
          <div className="space-y-3 p-4 pt-0">
            <Select label="Shipment Status" options={SHIPMENT_STATUSES} value={deliveryForm.shipmentStatus} onChange={(e) => setDeliveryForm({ ...deliveryForm, shipmentStatus: e.target.value })} />
            <Input label="Delivery Date" type="date" value={deliveryForm.deliveryDate} onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })} />
            <Input label="Delivery Location" value={deliveryForm.deliveryLocation} onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryLocation: e.target.value })} />
            <Input label="Receiver Name" value={deliveryForm.receiverName} onChange={(e) => setDeliveryForm({ ...deliveryForm, receiverName: e.target.value })} />
            <Button icon={CheckCircle2} disabled={saving} onClick={saveDeliverySheet}>Save Delivery Sheet</Button>
          </div>
        </Card>

        <Card id="step-invoice" className={sectionClass('invoice')}>
          <CardHeader title="6. Invoice" subtitle={process.invoice ? process.invoice.invoiceNo : 'Generate after delivery'} />
          <div className="space-y-3 p-4 pt-0">
            {process.invoice ? (
              <div className="text-sm space-y-1">
                <p>Invoice: <strong>{process.invoice.invoiceNo}</strong></p>
                <p>Amount: {formatCurrency(process.invoice.totalAmount)} · Balance: {formatCurrency(process.invoice.balance)}</p>
                <p>Status: {process.invoice.status}</p>
              </div>
            ) : (
              <Button icon={Receipt} disabled={saving} onClick={createInvoice}>Generate Freight Invoice</Button>
            )}
          </div>
        </Card>

        <Card id="step-expense" className={sectionClass('expense')}>
          <CardHeader title="7–8. LR Expenses & Approval" subtitle="Add expenses; admin approves" />
          <div className="space-y-3 p-4 pt-0">
            <Select label="Category" options={process.expenseCategories} value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} />
            <Input label="Amount (₹)" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            <Textarea label="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className={inputClass} onChange={(e) => setExpenseForm({ ...expenseForm, file: e.target.files?.[0] ?? null })} />
            <Button icon={Receipt} disabled={saving} onClick={addExpense}>Add Expense</Button>

            {process.expenses?.length > 0 && (
              <div className="mt-4 space-y-3 border-t pt-3">
                {process.expenses.map((exp) => (
                  <div key={exp.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>{exp.category} — {formatCurrency(exp.amount)}</span>
                      <Badge variant={statusVariant(exp.status === 'Approved' ? 'Paid' : exp.status === 'Rejected' ? 'Cancelled' : 'Pending')}>{exp.status}</Badge>
                    </div>
                    <p className="text-slate-500">{exp.description || '—'} · Added by {exp.addedBy || '—'}</p>
                    {exp.attachmentUrl && <a href={exp.attachmentUrl} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">Attachment</a>}
                    {exp.status === 'Pending' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => approveExpense(exp.id)} disabled={saving}>Approve</Button>
                        <Input placeholder="Rejection remarks" value={rejectRemarks[exp.id] ?? ''} onChange={(e) => setRejectRemarks({ ...rejectRemarks, [exp.id]: e.target.value })} className="max-w-xs" />
                        <Button size="sm" variant="outline" onClick={() => rejectExpense(exp.id)} disabled={saving}>Reject</Button>
                      </div>
                    )}
                    {exp.rejectionRemarks && <p className="mt-1 text-red-600">Rejected: {exp.rejectionRemarks}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card id="step-close" className={`mt-4 p-4 ${sectionClass('close')}`}>
        <CardHeader title="9. Close LR" subtitle="After invoice and expense approval" />
        <Button icon={CheckCircle2} disabled={saving || process.status === 'Closed'} onClick={closeLr}>
          {process.status === 'Closed' ? 'LR Closed' : 'Close LR'}
        </Button>
      </Card>
    </ERPContentPage>
  )
}
