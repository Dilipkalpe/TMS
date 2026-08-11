import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import OpsWorkflowFlowBanner from '../../components/ops/OpsWorkflowFlowBanner'
import DispatchSelectLrModal from '../../components/ops/DispatchSelectLrModal'
import DispatchSummary from '../../components/ops/DispatchSummary'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import { OpsTimeline } from '../../components/ops/OpsPhase2Parts'
import {
  Send, Truck, ArrowLeft, Plus, Gauge, MapPin,
  ChevronDown, ChevronRight, Package, History,
} from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { parsePackagesWeight } from '../../utils/lrDisplayHelpers'
import { deriveTransitPassStatus } from '../../utils/opsWorkflowUtils'
import { usePrint } from '../../context/PrintContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { useToast } from '../../context/ToastContext'

function DispatchSection({
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
            {open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
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

function DispatchBlankEntry({ onBack, onSelectLr }) {
  const [selectOpen, setSelectOpen] = useState(false)

  return (
    <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="Dispatch"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Dispatch', path: '/operations/dispatch/list' },
          { label: 'New Dispatch' },
        ]}
      />
      <div className="loading-slip-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        <div className="loading-slip-hero mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Dispatch</p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Dispatch Vehicle</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                No LR selected — click Select LR to begin.
              </p>
            </div>
            <Button icon={Plus} onClick={() => setSelectOpen(true)}>Select LR</Button>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center dark:border-slate-600 dark:bg-slate-800/40">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Choose an LR with a transit pass generated to confirm vehicle dispatch.
          </p>
          <Button className="mt-4" icon={Plus} onClick={() => setSelectOpen(true)}>Select LR</Button>
        </div>
      </div>
      <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
        <LrEntryActionButtons
          onCancel={onBack}
          prependActions={<Button variant="outline" icon={ArrowLeft} type="button" onClick={onBack}>Back</Button>}
        />
      </footer>
      <DispatchSelectLrModal
        open={selectOpen}
        onClose={() => setSelectOpen(false)}
        onConfirm={(lrNumber) => {
          setSelectOpen(false)
          onSelectLr(lrNumber)
        }}
      />
    </div>
  )
}

function statusBadgeVariant(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('dispatch') || s.includes('transit') && !s.includes('pass')) return 'Paid'
  if (s.includes('pending')) return 'Pending'
  return 'outline'
}

function DispatchFormShell(props) {
  const [, setSearchParams] = useSearchParams()

  if (props.isBlank && !props.lrNumber) {
    return (
      <DispatchBlankEntry
        onBack={props.onBack}
        onSelectLr={(num) => setSearchParams({ lr: num })}
      />
    )
  }

  if (!props.lr || !props.lrNumber) {
    return (
      <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <ERPPageTitle module="Operations" title="Dispatch" breadcrumb={[{ label: 'Loading…' }]} />
        <p className="p-4 text-sm text-slate-500">Loading dispatch…</p>
      </div>
    )
  }

  return <DispatchForm {...props} />
}

function DispatchForm({ lrNumber, lr, process, saving, runSave }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const pass = process?.transitPass
  const delivery = process?.deliverySheet
  const dispatch = delivery?.extendedData?.dispatch || delivery?.dispatch
  const isDispatched = lr.status === 'In Transit' || delivery?.shipmentStatus === 'In Transit'
  const pkg = parsePackagesWeight(lr.quantity)
  const passStatus = deriveTransitPassStatus(lr, pass)
  const dispatchStatus = isDispatched ? 'Dispatched' : 'Pending'

  const [form, setForm] = useState({
    dispatchNo: delivery?.dispatchNo || dispatch?.dispatchNo || '—',
    dispatchDate: dispatch?.dispatchDate || new Date().toISOString().slice(0, 10),
    dispatchTime: dispatch?.dispatchTime || new Date().toTimeString().slice(0, 5),
    transitPassNo: pass?.passNumber || '—',
    startingKm: dispatch?.startingKm ?? '',
    fuelLevel: dispatch?.fuelLevel || 'Full',
    odometerReading: dispatch?.odometerReading ?? '',
    remarks: dispatch?.remarks || '',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (dispatch || delivery) {
      setForm((f) => ({
        ...f,
        dispatchNo: delivery?.dispatchNo || dispatch?.dispatchNo || f.dispatchNo,
        dispatchDate: dispatch?.dispatchDate || f.dispatchDate,
        dispatchTime: dispatch?.dispatchTime || f.dispatchTime,
        startingKm: dispatch?.startingKm ?? f.startingKm,
        fuelLevel: dispatch?.fuelLevel || f.fuelLevel,
        odometerReading: dispatch?.odometerReading ?? f.odometerReading,
        remarks: dispatch?.remarks || f.remarks,
      }))
    }
  }, [dispatch, delivery])

  const timeline = process?.statusHistory || []
  const pageTitle = isDispatched ? (form.dispatchNo !== '—' ? form.dispatchNo : 'Dispatch') : 'Dispatch Vehicle'

  const validateDispatch = () => {
    if (!pass) {
      toast({ title: 'Transit pass is required before dispatch.', type: 'error' })
      return false
    }
    if (passStatus === 'Cancelled') {
      toast({ title: 'Transit pass is cancelled.', type: 'error' })
      return false
    }
    if (form.startingKm === '' || Number(form.startingKm) < 0) {
      toast({ title: 'Enter a valid starting KM.', type: 'error' })
      return false
    }
    return true
  }

  const handleConfirm = () => {
    if (!validateDispatch()) return
    runSave('Vehicle dispatched', () =>
      lrProcessApi.confirmDispatch(lrNumber, {
        dispatchDate: form.dispatchDate,
        dispatchTime: form.dispatchTime,
        startingKm: Number(form.startingKm),
        fuelLevel: form.fuelLevel,
        odometerReading: form.odometerReading !== '' ? Number(form.odometerReading) : undefined,
        remarks: form.remarks,
      }))
  }

  const handlePrint = async () => {
    if (!isDispatched && !dispatch) {
      toast({ title: 'Confirm dispatch before printing.', type: 'warning' })
      return
    }
    await printModuleDocument({
      moduleCode: PRINT_MODULE_CODES.DISPATCH,
      company,
      print,
      documentData: { dispatch: delivery, lr, pass },
    })
  }

  const handleSave = () => {
    if (isDispatched) {
      handlePrint()
      return
    }
    handleConfirm()
  }

  const handleSavePrint = async () => {
    if (isDispatched) {
      handlePrint()
      return
    }
    if (!validateDispatch()) return
    await runSave('Vehicle dispatched', () =>
      lrProcessApi.confirmDispatch(lrNumber, {
        dispatchDate: form.dispatchDate,
        dispatchTime: form.dispatchTime,
        startingKm: Number(form.startingKm),
        fuelLevel: form.fuelLevel,
        odometerReading: form.odometerReading !== '' ? Number(form.odometerReading) : undefined,
        remarks: form.remarks,
      }))
    handlePrint()
  }

  const handleClear = () => {
    setForm({
      dispatchNo: delivery?.dispatchNo || dispatch?.dispatchNo || '—',
      dispatchDate: dispatch?.dispatchDate || new Date().toISOString().slice(0, 10),
      dispatchTime: dispatch?.dispatchTime || new Date().toTimeString().slice(0, 5),
      transitPassNo: pass?.passNumber || '—',
      startingKm: dispatch?.startingKm ?? '',
      fuelLevel: dispatch?.fuelLevel || 'Full',
      odometerReading: dispatch?.odometerReading ?? '',
      remarks: dispatch?.remarks || '',
    })
  }

  const handleCancel = () => navigate('/operations/dispatch/list')

  return (
    <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="Dispatch"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Dispatch', path: '/operations/dispatch/list' },
          { label: pageTitle },
        ]}
      />

      <div className="loading-slip-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4" data-kbd-form-root>
        <div className="loading-slip-hero mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Dispatch</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{pageTitle}</h1>
                <Badge variant={statusBadgeVariant(dispatchStatus)}>{dispatchStatus}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                LR: <span className="font-semibold text-primary">{lrNumber}</span>
                {form.transitPassNo !== '—' && (
                  <> · Pass: <span className="font-medium">{form.transitPassNo}</span></>
                )}
                {lr.from && lr.to && (
                  <> · {lr.from} → {lr.to}</>
                )}
              </p>
            </div>
            {isDispatched && (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={handlePrint}>Print</Button>
                <Button size="sm" onClick={() => navigate(`/operations/in-transit?lr=${encodeURIComponent(lrNumber)}`)}>
                  In Transit
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <OpsWorkflowFlowBanner lrNumber={lrNumber} lr={lr} process={process} currentStep="dispatch" />
        </div>

        <DispatchSection title="Dispatch Details" subtitle="Dispatch reference and schedule" icon={Send} className="mb-4">
          <div className="loading-slip-field-grid loading-slip-field-grid--5">
            <Input label="Dispatch No." value={form.dispatchNo} readOnly />
            <Input label="Transit Pass No." value={form.transitPassNo} readOnly />
            <Input label="Dispatch Date" type="date" value={form.dispatchDate} onChange={(e) => u('dispatchDate', e.target.value)} disabled={isDispatched} />
            <Input label="Dispatch Time" type="time" value={form.dispatchTime} onChange={(e) => u('dispatchTime', e.target.value)} disabled={isDispatched} />
            <Input label="Transit Pass Status" value={passStatus} readOnly />
            <Input label="LR Status" value={lr.status || '—'} readOnly />
          </div>
        </DispatchSection>

        <div className="loading-slip-two-col mb-4">
          <DispatchSection title="Vehicle & Route" subtitle="Vehicle, driver and lane" icon={Truck}>
            <div className="loading-slip-field-grid loading-slip-field-grid--4">
              <Input label="Vehicle No." value={pass?.vehicleNumber || lr.vehicle || '—'} readOnly />
              <Input label="Driver" value={pass?.driverName || lr.driver || '—'} readOnly />
              <Input label="Origin" value={pass?.routeFrom || lr.from || '—'} readOnly />
              <Input label="Destination" value={pass?.routeTo || lr.to || '—'} readOnly />
            </div>
          </DispatchSection>
          <DispatchSection title="Trip Summary" subtitle="Load on this dispatch" icon={Package}>
            <div className="loading-slip-field-grid">
              <Input label="LR Count" readOnly value="1" />
              <Input label="Packages" readOnly value={String(pkg.packages)} />
              <Input label="Weight (Kg)" readOnly value={String(pkg.weight)} />
            </div>
          </DispatchSection>
        </div>

        <DispatchSection title="Gate-Out / Odometer" subtitle="Starting KM, fuel and odometer reading" icon={Gauge} className="mb-4">
          <div className="loading-slip-field-grid loading-slip-field-grid--4">
            <Input label="Starting KM *" type="number" min="0" value={form.startingKm} onChange={(e) => u('startingKm', e.target.value)} disabled={isDispatched} />
            <Select label="Fuel Level" options={['Full', '3/4', '1/2', '1/4', 'Low']} value={form.fuelLevel} onChange={(e) => u('fuelLevel', e.target.value)} disabled={isDispatched} />
            <Input label="Odometer Reading" type="number" min="0" value={form.odometerReading} onChange={(e) => u('odometerReading', e.target.value)} disabled={isDispatched} />
            <Input label="Vehicle at Gate" value={pass?.vehicleNumber || lr.vehicle || '—'} readOnly />
          </div>
        </DispatchSection>

        <DispatchSection title="Remarks" subtitle="Gate-out notes for driver and security" icon={MapPin} className="mb-4" collapsible defaultOpen={!!form.remarks}>
          <Textarea rows={5} maxLength={200} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} disabled={isDispatched} placeholder="Vehicle cleared for dispatch. Documents verified..." />
        </DispatchSection>

        <DispatchSection title="Status History" subtitle="Workflow events for this LR" icon={History} collapsible defaultOpen={false}>
          <OpsTimeline rows={timeline} />
        </DispatchSection>
      </div>

      <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
        <LrEntryActionButtons
          saving={saving}
          onClear={handleClear}
          onCancel={handleCancel}
          onPreview={handlePrint}
          onSave={handleSave}
          onSavePrint={handleSavePrint}
          prependActions={
            !isDispatched && pass ? (
              <Button icon={Send} type="button" onClick={handleConfirm} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                Confirm Dispatch
              </Button>
            ) : null
          }
          financialSummary={(
            <DispatchSummary
              packages={pkg.packages}
              weight={pkg.weight}
              passStatus={passStatus}
              dispatchStatus={dispatchStatus}
            />
          )}
        />
      </footer>
    </div>
  )
}

export default function DispatchPage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="Dispatch"
      stage="transit-pass-generated"
      processStep="delivery"
      basePath="/operations/dispatch"
      listPath="/operations/dispatch/list"
      queueHint="Select an LR with transit pass generated to confirm vehicle dispatch."
      allowBlankEntry
    >
      {(ctx) => <DispatchFormShell {...ctx} />}
    </OpsLrQueueGate>
  )
}
