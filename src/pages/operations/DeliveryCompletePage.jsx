import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import OpsWorkflowFlowBanner from '../../components/ops/OpsWorkflowFlowBanner'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import { OpsPhotoGrid, OpsTimeline } from '../../components/ops/OpsPhase2Parts'
import {
  PackageCheck, User, Truck, Camera, History, ClipboardCheck, ChevronDown, ChevronRight, ArrowRight,
} from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { parsePackagesWeight } from '../../utils/lrDisplayHelpers'
import { deriveInTransitStatus, mergeExtendedData, statusBadgeVariant } from '../../utils/opsWorkflowUtils'
import { buildDeliveryPrintModel } from '../../utils/deliveryPodPrintUtils'
import { usePrint } from '../../context/PrintContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { useToast } from '../../context/ToastContext'

const DELIVERY_OUTCOMES = ['Delivered', 'Partial', 'Failed']

function DeliverySection({
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

function DeliverySummaryBar({ packagesReceived, packagesTotal, status, receiverName }) {
  return (
    <div className="hidden items-center gap-4 text-xs text-slate-600 sm:flex dark:text-slate-300">
      <span>
        Packages{' '}
        <strong className="tabular-nums text-slate-900 dark:text-white">
          {packagesReceived}/{packagesTotal}
        </strong>
      </span>
      <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
      <span>
        Status <strong className="text-slate-900 dark:text-white">{status}</strong>
      </span>
      {receiverName ? (
        <>
          <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span>
            Receiver <strong className="text-slate-900 dark:text-white">{receiverName}</strong>
          </span>
        </>
      ) : null}
    </div>
  )
}

function deriveDeliveryBadge(delivery, formStatus) {
  const shipment = delivery?.shipmentStatus
  if (shipment === 'POD Received' || shipment === 'Closed') return shipment
  if (shipment === 'Delivered') return 'Delivered'
  const inTransit = deriveInTransitStatus(delivery)
  if (inTransit === 'Reached Destination') return 'Ready for Delivery'
  return formStatus || 'Pending Delivery'
}

function emptyFormFrom(lr, delivery, pkg) {
  return {
    tripNo: delivery?.tripNo || delivery?.dispatchNo || lr.vehicle || '',
    deliveryDate: delivery?.deliveryDate || new Date().toISOString().slice(0, 10),
    deliveryTime: delivery?.deliveryTime || new Date().toTimeString().slice(0, 5),
    deliveryBranch: lr.branchName || '',
    packagesTotal: delivery?.packagesTotal ?? pkg.packages,
    packagesReceived: delivery?.packagesReceived ?? pkg.packages,
    packagesDamaged: delivery?.packagesDamaged ?? 0,
    actualWeight: delivery?.actualWeight ?? pkg.weight,
    chargedWeight: delivery?.chargedWeight ?? pkg.weight,
    deliveryStatus: delivery?.shipmentStatus === 'Delivered'
      ? (delivery?.extendedData?.deliveryOutcome || 'Delivered')
      : 'Delivered',
    failureReason: delivery?.extendedData?.failureReason || '',
    nextAttemptDate: delivery?.extendedData?.nextAttemptDate || '',
    shortPackages: delivery?.extendedData?.shortPackages ?? 0,
    shortWeight: delivery?.extendedData?.shortWeight ?? 0,
    shortReason: delivery?.extendedData?.shortReason || '',
    receiverName: delivery?.receiverName || lr.consignee || '',
    receiverDesignation: delivery?.receiverDesignation || '',
    receiverMobile: delivery?.receiverMobile || '',
    remarks: delivery?.remarks || '',
  }
}

function DeliveryCompleteForm({ lrNumber, lr, process, saving, runSave, reload, onBack }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const delivery = process?.deliverySheet
  const pkg = parsePackagesWeight(lr.quantity)
  const [form, setForm] = useState(() => emptyFormFrom(lr, delivery, pkg))
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    setForm(emptyFormFrom(lr, delivery, pkg))
  }, [delivery, lr, pkg.packages, pkg.weight])

  const badgeLabel = useMemo(
    () => deriveDeliveryBadge(delivery, form.deliveryStatus),
    [delivery, form.deliveryStatus],
  )

  const persistDelivery = () => {
    const received = Number(form.packagesReceived)
    const total = Number(form.packagesTotal)
    if (received > total) {
      toast({ title: 'Received packages cannot exceed expected.', type: 'error' })
      return null
    }
    if (form.deliveryStatus === 'Failed' && !form.failureReason?.trim()) {
      toast({ title: 'Failure reason is required for failed delivery.', type: 'error' })
      return null
    }
    const shipmentStatus = form.deliveryStatus === 'Failed' ? 'In Transit' : 'Delivered'
    const label = form.deliveryStatus === 'Failed' ? 'Failed delivery recorded' : 'Delivery completed'
    return runSave(label, () =>
      lrProcessApi.saveDeliverySheet(lrNumber, {
        shipmentStatus,
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        deliveryLocation: lr.to,
        tripNo: form.tripNo,
        packagesTotal: total,
        packagesReceived: received,
        packagesDamaged: Number(form.packagesDamaged),
        actualWeight: Number(form.actualWeight),
        chargedWeight: Number(form.chargedWeight),
        receiverName: form.receiverName,
        receiverDesignation: form.receiverDesignation,
        receiverMobile: form.receiverMobile,
        remarks: form.remarks,
        extendedData: mergeExtendedData(process?.deliverySheet?.extendedData, {
          deliveryOutcome: form.deliveryStatus,
          failureReason: form.failureReason,
          nextAttemptDate: form.nextAttemptDate,
          shortPackages: form.shortPackages,
          shortWeight: form.shortWeight,
          shortReason: form.shortReason,
          deliveryBranch: form.deliveryBranch,
        }),
      }))
  }

  const handleSave = () => persistDelivery()

  const handleSaveNextPod = async () => {
    const result = persistDelivery()
    if (!result) return
    await result
    navigate(`/operations/delivery/pod?lr=${encodeURIComponent(lrNumber)}`)
  }

  const photos = process?.deliveryDocuments || []
  const timeline = process?.statusHistory || []

  const printModel = () => buildDeliveryPrintModel({
    lr,
    delivery: process?.deliverySheet,
    form,
    process,
  })

  const handlePrint = async () => {
    await printModuleDocument({
      moduleCode: PRINT_MODULE_CODES.DELIVERY_COMPLETE,
      company,
      print,
      documentData: { model: printModel() },
    })
  }

  const handleSavePrint = async () => {
    const result = persistDelivery()
    if (!result) return
    await result
    await handlePrint()
  }

  const handleClear = () => setForm(emptyFormFrom(lr, delivery, pkg))
  const handleCancel = () => navigate('/operations/delivery-complete/list')

  return (
    <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="Delivery Complete"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Delivery Complete', path: '/operations/delivery-complete/list' },
          { label: lrNumber },
        ]}
      />

      <div className="loading-slip-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4" data-kbd-form-root>
        <div className="loading-slip-hero mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Delivery</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  Confirm Delivery
                </h1>
                <Badge variant={statusBadgeVariant(badgeLabel)}>{badgeLabel}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                LR: <span className="font-semibold text-primary">{lrNumber}</span>
                {form.tripNo && (
                  <> · Trip: <span className="font-medium">{form.tripNo}</span></>
                )}
                {lr.from && lr.to && (
                  <> · {lr.from} → {lr.to}</>
                )}
                {lr.consignee && (
                  <> · Consignee: <span className="font-medium">{lr.consignee}</span></>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onBack || handleCancel}>Back to list</Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>Print</Button>
              <Button size="sm" icon={ArrowRight} onClick={handleSaveNextPod} disabled={saving}>
                Save & POD
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <OpsWorkflowFlowBanner lrNumber={lrNumber} lr={lr} process={process} currentStep="delivery" />
        </div>

        <DeliverySection
          title="Shipment summary"
          subtitle="Trip and LR details for this delivery"
          icon={Truck}
          className="mb-4"
        >
          <div className="loading-slip-field-grid loading-slip-field-grid--4">
            <Input label="Trip No." value={form.tripNo} onChange={(e) => u('tripNo', e.target.value)} />
            <Input label="Delivery Date" type="date" value={form.deliveryDate} onChange={(e) => u('deliveryDate', e.target.value)} />
            <Input label="Delivery Time" type="time" value={form.deliveryTime} onChange={(e) => u('deliveryTime', e.target.value)} />
            <Input label="Delivery Branch" value={form.deliveryBranch} onChange={(e) => u('deliveryBranch', e.target.value)} />
            <Input label="LR No." value={lrNumber} readOnly />
            <Input label="LR Date" value={lr.lrDate || '—'} readOnly />
            <Input label="Payment Type" value={lr.paymentType || '—'} readOnly />
            <Input label="Freight Type" value={lr.businessType || '—'} readOnly />
          </div>
        </DeliverySection>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <DeliverySection title="Customer / Consignee" subtitle="Destination party details" icon={User}>
            <div className="loading-slip-field-grid loading-slip-field-grid--2">
              <Input label="Consignee Name" value={lr.consignee || '—'} readOnly />
              <Input label="Customer / Consignor" value={lr.customerName || lr.consignor || '—'} readOnly />
              <div className="sm:col-span-2">
                <Input label="Delivery city / address" value={lr.to || '—'} readOnly />
              </div>
            </div>
          </DeliverySection>

          <DeliverySection title="Received by" subtitle="Person who accepted the consignment" icon={ClipboardCheck}>
            <div className="loading-slip-field-grid loading-slip-field-grid--2">
              <Input label="Receiver Name *" value={form.receiverName} onChange={(e) => u('receiverName', e.target.value)} />
              <Input label="Designation" value={form.receiverDesignation} onChange={(e) => u('receiverDesignation', e.target.value)} />
              <Input label="Mobile" value={form.receiverMobile} onChange={(e) => u('receiverMobile', e.target.value)} />
            </div>
          </DeliverySection>
        </div>

        <DeliverySection
          title="Delivery confirmation"
          subtitle="Packages, weight and delivery outcome"
          icon={PackageCheck}
          className="mb-4"
        >
          <div className="loading-slip-field-grid loading-slip-field-grid--3">
            <Input label="No. of Packages" type="number" value={form.packagesTotal} onChange={(e) => u('packagesTotal', e.target.value)} />
            <Input label="Received Packages" type="number" value={form.packagesReceived} onChange={(e) => u('packagesReceived', e.target.value)} />
            <Input label="Damaged Packages" type="number" value={form.packagesDamaged} onChange={(e) => u('packagesDamaged', e.target.value)} />
            <Input label="Actual Weight (Kg)" value={form.actualWeight} onChange={(e) => u('actualWeight', e.target.value)} />
            <Input label="Charged Weight (Kg)" value={form.chargedWeight} onChange={(e) => u('chargedWeight', e.target.value)} />
            <Select
              label="Delivery Status"
              options={DELIVERY_OUTCOMES}
              value={form.deliveryStatus}
              onChange={(e) => u('deliveryStatus', e.target.value)}
            />
          </div>

          {form.deliveryStatus === 'Partial' && (
            <div className="loading-slip-field-grid loading-slip-field-grid--3 mt-3">
              <Input label="Short Packages" type="number" value={form.shortPackages} onChange={(e) => u('shortPackages', e.target.value)} />
              <Input label="Short Weight" type="number" value={form.shortWeight} onChange={(e) => u('shortWeight', e.target.value)} />
              <Input label="Short Reason" value={form.shortReason} onChange={(e) => u('shortReason', e.target.value)} />
            </div>
          )}

          {form.deliveryStatus === 'Failed' && (
            <div className="loading-slip-field-grid loading-slip-field-grid--2 mt-3">
              <Input label="Failure Reason *" value={form.failureReason} onChange={(e) => u('failureReason', e.target.value)} />
              <Input label="Next Attempt Date" type="date" value={form.nextAttemptDate} onChange={(e) => u('nextAttemptDate', e.target.value)} />
            </div>
          )}

          <div className="mt-3">
            <Textarea
              label="Remarks"
              rows={2}
              maxLength={200}
              value={form.remarks}
              onChange={(e) => u('remarks', e.target.value)}
              placeholder="Gate pass, shortage notes, customer feedback…"
            />
          </div>
        </DeliverySection>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <DeliverySection title="Delivery photos" subtitle="Optional proof images before POD" icon={Camera}>
            <OpsPhotoGrid
              lrNumber={lrNumber}
              photos={photos}
              uploadFn={lrProcessApi.uploadDeliveryDocument}
              onUploaded={reload}
            />
          </DeliverySection>

          <DeliverySection
            title="Status history"
            subtitle="LR process timeline"
            icon={History}
            collapsible
            defaultOpen={false}
          >
            <OpsTimeline rows={timeline} />
          </DeliverySection>
        </div>
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
              onClick={handleSaveNextPod}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Save & Next POD
            </Button>
          )}
          financialSummary={(
            <DeliverySummaryBar
              packagesReceived={form.packagesReceived}
              packagesTotal={form.packagesTotal}
              status={form.deliveryStatus}
              receiverName={form.receiverName}
            />
          )}
        />
      </footer>
    </div>
  )
}

export default function DeliveryCompletePage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="Delivery Complete"
      stage="dispatched"
      processStep="delivery"
      basePath="/operations/delivery-complete"
      listPath="/operations/delivery-complete/list"
      queueHint="Select an LR that reached destination to confirm delivery."
    >
      {(ctx) => <DeliveryCompleteForm {...ctx} />}
    </OpsLrQueueGate>
  )
}
