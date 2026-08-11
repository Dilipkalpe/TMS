import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import OpsWorkflowFlowBanner from '../../components/ops/OpsWorkflowFlowBanner'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import { OpsAttachments, OpsPhotoGrid, OpsSignaturePad, useOpsExtended } from '../../components/ops/OpsPhase2Parts'
import {
  PackageCheck, MapPin, User, Camera, FileText, PenLine, Stamp,
  ChevronDown, ChevronRight, ShieldCheck, ShieldX, ArrowRight,
} from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { parsePackagesWeight } from '../../utils/lrDisplayHelpers'
import { derivePodVerificationStatus, mergeExtendedData, statusBadgeVariant } from '../../utils/opsWorkflowUtils'
import { usePrint } from '../../context/PrintContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { buildPodPrintModel } from '../../utils/deliveryPodPrintUtils'

const SHIPMENT_STATUSES = ['Delivered', 'POD Received', 'Closed']
const CONDITIONS = ['Good', 'Damaged', 'Short']

function PodSection({
  title, subtitle, icon: Icon, children, action, className = '',
  collapsible = false, defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (collapsible) {
    return (
      <section className={`loading-slip-section loading-slip-section--collapsible ${className}`}>
        <button
          type="button"
          className="loading-slip-section-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="flex items-start gap-2.5 text-left">
            {open
              ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
            {Icon && (
              <span className="loading-slip-section-icon">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <span>
              <span className="loading-slip-section-title block">{title}</span>
              {subtitle && <span className="loading-slip-section-sub block">{subtitle}</span>}
            </span>
          </span>
          {action ? <span onClick={(e) => e.stopPropagation()}>{action}</span> : null}
        </button>
        {open ? <div className="loading-slip-section-body">{children}</div> : null}
      </section>
    )
  }

  return (
    <section className={`loading-slip-section ${className}`}>
      <div className="loading-slip-section-head">
        <div className="flex items-start gap-2.5">
          {Icon && (
            <span className="loading-slip-section-icon">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div>
            <h2 className="loading-slip-section-title">{title}</h2>
            {subtitle && <p className="loading-slip-section-sub">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function PodSummaryBar({ verificationStatus, shipmentStatus, condition, packages }) {
  return (
    <div className="hidden items-center gap-4 text-xs text-slate-600 sm:flex dark:text-slate-300">
      <span>
        POD <strong className="text-slate-900 dark:text-white">{verificationStatus}</strong>
      </span>
      <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
      <span>
        Delivery <strong className="text-slate-900 dark:text-white">{shipmentStatus}</strong>
      </span>
      <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
      <span>
        Packages <strong className="tabular-nums text-slate-900 dark:text-white">{packages}</strong>
      </span>
      <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
      <span>
        Condition <strong className="text-slate-900 dark:text-white">{condition}</strong>
      </span>
    </div>
  )
}

function emptyPodForm(lr, delivery, pkg) {
  return {
    deliveryDate: delivery?.deliveryDate || new Date().toISOString().slice(0, 10),
    deliveryLocation: delivery?.deliveryLocation || lr.to || '',
    receiverName: delivery?.receiverName || lr.consignee || '',
    podNo: delivery?.podNo || delivery?.sheetNumber || '',
    deliveryNoteNo: delivery?.deliveryNoteNo || '',
    shipmentStatus: delivery?.shipmentStatus === 'In Transit'
      ? 'Delivered'
      : (delivery?.shipmentStatus || 'POD Received'),
    remarks: delivery?.remarks || '',
    packages: delivery?.packagesTotal ?? pkg.packages,
    actualWeight: delivery?.actualWeight ?? pkg.weight,
    chargedWeight: delivery?.chargedWeight ?? pkg.weight,
    condition: delivery?.condition || 'Good',
  }
}

function PodEntryForm({ lrNumber, lr, process, saving, runSave, reload, onBack }) {
  const navigate = useNavigate()
  const { company, print } = usePrint()
  const delivery = process?.deliverySheet
  const ext = delivery?.extendedData || {}
  const pkg = parsePackagesWeight(lr.quantity)
  const [form, setForm] = useState(() => emptyPodForm(lr, delivery, pkg))
  const [extended, mergeExt] = useOpsExtended({
    signatures: ext.signatures || {},
    receiverStamp: ext.receiverStamp || '',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    setForm(emptyPodForm(lr, delivery, pkg))
    mergeExt({
      signatures: delivery?.extendedData?.signatures || {},
      receiverStamp: delivery?.extendedData?.receiverStamp || '',
    })
  }, [delivery, lr, pkg.packages, pkg.weight]) // eslint-disable-line react-hooks/exhaustive-deps

  const docs = process?.deliveryDocuments || []
  const verificationStatus = derivePodVerificationStatus(delivery)
  const canVerify = verificationStatus === 'Pending' && (lr.status === 'Delivery Completed' || form.shipmentStatus === 'Delivered' || form.shipmentStatus === 'POD Received')

  const badgeLabel = useMemo(() => {
    if (verificationStatus === 'Verified' || verificationStatus === 'Received') return 'POD Verified'
    if (verificationStatus === 'Rejected') return 'POD Rejected'
    return 'POD Pending'
  }, [verificationStatus])

  const persistPod = () => runSave('POD saved', () =>
    lrProcessApi.saveDeliverySheet(lrNumber, {
      shipmentStatus: form.shipmentStatus,
      deliveryDate: form.deliveryDate,
      deliveryLocation: form.deliveryLocation,
      receiverName: form.receiverName,
      podNo: form.podNo,
      deliveryNoteNo: form.deliveryNoteNo,
      condition: form.condition,
      packagesTotal: Number(form.packages),
      actualWeight: Number(form.actualWeight),
      chargedWeight: Number(form.chargedWeight),
      remarks: form.remarks,
      extendedData: mergeExtendedData(delivery?.extendedData, {
        signatures: extended.signatures,
        receiverStamp: extended.receiverStamp,
      }),
    }))

  const handleSave = () => persistPod()

  const handleVerify = () => runSave('POD verified', () => lrProcessApi.verifyPod(lrNumber))

  const handleReject = () => {
    const reason = window.prompt('Rejection reason (required):')
    if (!reason?.trim()) return
    runSave('POD rejected', () => lrProcessApi.rejectPod(lrNumber, reason.trim()))
  }

  const printModel = () => buildPodPrintModel({
    lr,
    delivery,
    form: { ...form, signatures: extended.signatures, receiverStamp: extended.receiverStamp },
    process,
    documents: docs,
  })

  const handlePrint = async () => {
    await printModuleDocument({
      moduleCode: PRINT_MODULE_CODES.POD,
      company,
      print,
      documentData: { model: printModel() },
    })
  }

  const handleSavePrint = async () => {
    await persistPod()
    await handlePrint()
  }

  const handleSaveNextBilling = async () => {
    await persistPod()
    if (canVerify && verificationStatus === 'Pending') {
      await runSave('POD verified', () => lrProcessApi.verifyPod(lrNumber))
    }
    navigate(`/operations/billing/invoice?lr=${encodeURIComponent(lrNumber)}`)
  }

  const handleClear = () => {
    setForm(emptyPodForm(lr, delivery, pkg))
    mergeExt({
      signatures: delivery?.extendedData?.signatures || {},
      receiverStamp: delivery?.extendedData?.receiverStamp || '',
    })
  }

  const handleCancel = () => navigate('/operations/delivery/pod/list')

  return (
    <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="POD (Proof of Delivery)"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'POD', path: '/operations/delivery/pod/list' },
          { label: lrNumber },
        ]}
      />

      <div className="loading-slip-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4" data-kbd-form-root>
        <div className="loading-slip-hero mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Proof of Delivery</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">POD Entry</h1>
                <Badge variant={statusBadgeVariant(badgeLabel)}>{badgeLabel}</Badge>
                <Badge variant={statusBadgeVariant(lr.status)}>{lr.status || '—'}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                LR: <span className="font-semibold text-primary">{lrNumber}</span>
                {lr.vehicle && (
                  <> · Vehicle: <span className="font-medium">{lr.vehicle}</span></>
                )}
                {lr.from && lr.to && (
                  <> · {lr.from} → {lr.to}</>
                )}
                {form.receiverName && (
                  <> · Receiver: <span className="font-medium">{form.receiverName}</span></>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onBack || handleCancel}>Back to list</Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>Print POD</Button>
              {canVerify && (
                <>
                  <Button size="sm" icon={ShieldCheck} className="bg-emerald-600 hover:bg-emerald-700" onClick={handleVerify} disabled={saving}>
                    Verify POD
                  </Button>
                  <Button size="sm" variant="outline" icon={ShieldX} className="border-red-200 text-red-600" onClick={handleReject} disabled={saving}>
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <OpsWorkflowFlowBanner lrNumber={lrNumber} lr={lr} process={process} currentStep="pod" />
        </div>

        <PodSection
          title="POD information"
          subtitle="Document numbers and delivery outcome"
          icon={PackageCheck}
          className="mb-4"
        >
          <div className="loading-slip-field-grid loading-slip-field-grid--4">
            <Input label="LR No." value={lrNumber} readOnly />
            <Input label="POD No." value={form.podNo} onChange={(e) => u('podNo', e.target.value)} placeholder="Auto / enter POD no." />
            <Input label="Delivery Note No." value={form.deliveryNoteNo} onChange={(e) => u('deliveryNoteNo', e.target.value)} />
            <Input label="Delivery Date" type="date" value={form.deliveryDate} onChange={(e) => u('deliveryDate', e.target.value)} />
            <Select label="Delivery Status" options={SHIPMENT_STATUSES} value={form.shipmentStatus} onChange={(e) => u('shipmentStatus', e.target.value)} />
            <Select label="Condition" options={CONDITIONS} value={form.condition} onChange={(e) => u('condition', e.target.value)} />
            <Input label="Packages" type="number" value={form.packages} onChange={(e) => u('packages', e.target.value)} />
            <Input label="Actual Weight (Kg)" value={form.actualWeight} onChange={(e) => u('actualWeight', e.target.value)} />
          </div>
        </PodSection>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <PodSection title="Customer / Consignee" subtitle="Who received the consignment" icon={User}>
            <div className="loading-slip-field-grid loading-slip-field-grid--2">
              <Input label="Consignee" value={lr.consignee || '—'} readOnly />
              <Input label="Customer" value={lr.customerName || lr.consignor || '—'} readOnly />
              <Input label="Receiver Name *" value={form.receiverName} onChange={(e) => u('receiverName', e.target.value)} />
              <Input label="Charged Weight (Kg)" value={form.chargedWeight} onChange={(e) => u('chargedWeight', e.target.value)} />
            </div>
          </PodSection>

          <PodSection title="Delivery location" subtitle="Where delivery was completed" icon={MapPin}>
            <div className="loading-slip-field-grid loading-slip-field-grid--2">
              <div className="sm:col-span-2">
                <Input label="Delivery Address" value={form.deliveryLocation} onChange={(e) => u('deliveryLocation', e.target.value)} />
              </div>
              <Input label="From" value={lr.from || '—'} readOnly />
              <Input label="To" value={lr.to || '—'} readOnly />
            </div>
          </PodSection>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <PodSection title="Receiver signature" subtitle="Capture acceptor signature" icon={PenLine}>
            <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/40">
              <OpsSignaturePad
                label="Draw signature"
                value={extended.signatures?.receiver}
                onChange={(v) => mergeExt({ signatures: { ...extended.signatures, receiver: v } })}
                height={120}
              />
            </div>
          </PodSection>

          <PodSection title="Company stamp / seal" subtitle="Optional stamp image" icon={Stamp}>
            <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/40">
              <OpsSignaturePad
                label="Draw or stamp"
                value={extended.receiverStamp}
                onChange={(v) => mergeExt({ receiverStamp: v })}
                height={120}
              />
            </div>
          </PodSection>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <PodSection title="Delivery photos" subtitle="Site / package photos" icon={Camera}>
            <OpsPhotoGrid
              lrNumber={lrNumber}
              photos={docs}
              uploadFn={lrProcessApi.uploadDeliveryDocument}
              onUploaded={reload}
            />
          </PodSection>

          <PodSection
            title="POD attachments"
            subtitle="Scanned POD / delivery note files"
            icon={FileText}
            collapsible
            defaultOpen={docs.some((d) => d.docType === 'POD')}
          >
            <OpsAttachments
              lrNumber={lrNumber}
              documents={docs.filter((d) => d.docType === 'POD')}
              docType="POD"
              uploadFn={lrProcessApi.uploadDeliveryDocument}
              onUploaded={reload}
            />
          </PodSection>
        </div>

        <PodSection title="Remarks" subtitle="Delivery note or verification comments" icon={FileText} className="mb-2">
          <Textarea
            label="Remarks / Delivery Note"
            rows={2}
            maxLength={200}
            value={form.remarks}
            onChange={(e) => u('remarks', e.target.value)}
            placeholder="Shortage, damage notes, customer comments…"
          />
        </PodSection>
      </div>

      <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
        <LrEntryActionButtons
          saving={saving}
          onClear={handleClear}
          onCancel={handleCancel}
          onPreview={handlePrint}
          onSave={handleSave}
          onSavePrint={handleSavePrint}
          prependActions={(
            <Button
              type="button"
              icon={ArrowRight}
              onClick={handleSaveNextBilling}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Save & Billing
            </Button>
          )}
          financialSummary={(
            <PodSummaryBar
              verificationStatus={verificationStatus}
              shipmentStatus={form.shipmentStatus}
              condition={form.condition}
              packages={form.packages}
            />
          )}
        />
      </footer>
    </div>
  )
}

export default function PodEntryPage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="POD Entry"
      stage="delivered"
      processStep="delivery"
      basePath="/operations/delivery/pod"
      listPath="/operations/delivery/pod/list"
      queueHint="Select a delivered LR to capture POD signature, photos, and verification."
    >
      {(ctx) => <PodEntryForm {...ctx} />}
    </OpsLrQueueGate>
  )
}
