import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import OpsWorkflowFlowBanner from '../../components/ops/OpsWorkflowFlowBanner'
import InTransitSelectLrModal from '../../components/ops/InTransitSelectLrModal'
import InTransitSummary from '../../components/ops/InTransitSummary'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import { OpsTimeline } from '../../components/ops/OpsPhase2Parts'
import {
  MapPin, Truck, Plus, Package, History, Route,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { parsePackagesWeight } from '../../utils/lrDisplayHelpers'
import { deriveInTransitStatus, normalizeCheckpoints } from '../../utils/opsWorkflowUtils'
import { useToast } from '../../context/ToastContext'

const IN_TRANSIT_STATUSES = ['Dispatched', 'In Transit', 'Delayed', 'At Checkpoint', 'Reached Destination']

function TransitSection({
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

function CheckpointTable({ checkpoints }) {
  if (!checkpoints.length) {
    return (
      <div className="loading-slip-empty-table rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center dark:border-slate-600 dark:bg-slate-900/50">
        <p className="text-sm text-slate-500">No checkpoints recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="loading-slip-table-wrap overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="loading-slip-table w-full min-w-[760px] text-sm">
        <thead>
          <tr>
            <th>Location</th>
            <th>Date</th>
            <th>Time</th>
            <th className="text-right">KM</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {checkpoints.map((c, i) => (
            <tr key={c.id || i}>
              <td className="font-medium text-slate-800 dark:text-slate-100">{c.location}</td>
              <td>{c.date || '—'}</td>
              <td>{c.time || '—'}</td>
              <td className="text-right tabular-nums">{c.km ?? '—'}</td>
              <td>{c.status || '—'}</td>
              <td>{c.remarks || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InTransitBlankEntry({ onBack, onSelectLr }) {
  const [selectOpen, setSelectOpen] = useState(false)

  return (
    <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="In Transit"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'In Transit', path: '/operations/in-transit/list' },
          { label: 'Track Shipment' },
        ]}
      />
      <div className="loading-slip-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        <div className="loading-slip-hero mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">In Transit</p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">In Transit Tracking</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                No LR selected — click Select LR to begin tracking.
              </p>
            </div>
            <Button icon={Plus} onClick={() => setSelectOpen(true)}>Select LR</Button>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center dark:border-slate-600 dark:bg-slate-800/40">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Choose a dispatched LR to update location, status, and checkpoints.
          </p>
          <Button className="mt-4" icon={Plus} onClick={() => setSelectOpen(true)}>Select LR</Button>
        </div>
      </div>
      <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
        <LrEntryActionButtons onCancel={onBack} />
      </footer>
      <InTransitSelectLrModal
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
  if (s.includes('reached') || s.includes('destination')) return 'Paid'
  if (s.includes('delayed')) return 'outline'
  return 'Pending'
}

function InTransitFormShell(props) {
  const [, setSearchParams] = useSearchParams()

  if (props.isBlank && !props.lrNumber) {
    return (
      <InTransitBlankEntry
        onBack={props.onBack}
        onSelectLr={(num) => setSearchParams({ lr: num })}
      />
    )
  }

  if (!props.lr || !props.lrNumber) {
    return (
      <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <ERPPageTitle module="Operations" title="In Transit" breadcrumb={[{ label: 'Loading…' }]} />
        <p className="p-4 text-sm text-slate-500">Loading in-transit details…</p>
      </div>
    )
  }

  return <InTransitForm {...props} />
}

function InTransitForm({ lrNumber, lr, process, saving, runSave }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const delivery = process?.deliverySheet
  const pass = process?.transitPass
  const checkpoints = normalizeCheckpoints(delivery)
  const pkg = parsePackagesWeight(lr.quantity)
  const inTransitStatus = deriveInTransitStatus(delivery)

  const [checkpointForm, setCheckpointForm] = useState({
    location: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    km: '',
    status: 'Passed',
    remarks: '',
  })
  const [statusForm, setStatusForm] = useState({
    status: inTransitStatus || 'In Transit',
    currentLocation: delivery?.currentLocation || '',
  })

  useEffect(() => {
    setStatusForm({
      status: deriveInTransitStatus(delivery) || 'In Transit',
      currentLocation: delivery?.currentLocation || delivery?.extendedData?.currentLocation || '',
    })
  }, [delivery])

  const addCheckpoint = () => {
    if (!checkpointForm.location.trim()) {
      toast({ title: 'Checkpoint location is required.', type: 'error' })
      return
    }
    runSave('Checkpoint added', () =>
      lrProcessApi.addCheckpoint(lrNumber, {
        location: checkpointForm.location,
        date: checkpointForm.date,
        time: checkpointForm.time,
        km: checkpointForm.km !== '' ? Number(checkpointForm.km) : 0,
        status: checkpointForm.status,
        remarks: checkpointForm.remarks,
      }))
    setCheckpointForm((f) => ({ ...f, location: '', km: '', remarks: '' }))
  }

  const updateStatus = async () => {
    const nextStatus = statusForm.status
    await runSave(
      nextStatus === 'Reached Destination'
        ? 'Reached destination — open Delivery Complete to confirm'
        : 'Status updated',
      () => lrProcessApi.updateInTransitStatus(lrNumber, {
        status: nextStatus,
        currentLocation: statusForm.currentLocation,
      }),
    )
    if (nextStatus === 'Reached Destination') {
      navigate(`/operations/delivery-complete?lr=${encodeURIComponent(lrNumber)}`)
    }
  }

  const timeline = [
    ...(process?.statusHistory || []),
    ...checkpoints.map((c) => ({
      at: `${c.date || ''} ${c.time || ''}`.trim(),
      status: c.status || 'Checkpoint',
      location: c.location,
      remarks: c.remarks,
    })),
  ]

  const handleClear = () => {
    setStatusForm({
      status: deriveInTransitStatus(delivery) || 'In Transit',
      currentLocation: delivery?.currentLocation || delivery?.extendedData?.currentLocation || '',
    })
    setCheckpointForm({
      location: '',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      km: '',
      status: 'Passed',
      remarks: '',
    })
  }

  const handleCancel = () => navigate('/operations/in-transit/list')

  return (
    <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="In Transit"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'In Transit', path: '/operations/in-transit/list' },
          { label: 'In Transit Tracking' },
        ]}
      />

      <div className="loading-slip-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4" data-kbd-form-root>
        <div className="loading-slip-hero mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">In Transit</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">In Transit Tracking</h1>
                <Badge variant={statusBadgeVariant(inTransitStatus)}>{inTransitStatus}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                LR: <span className="font-semibold text-primary">{lrNumber}</span>
                {pass?.passNumber && (
                  <> · Pass: <span className="font-medium">{pass.passNumber}</span></>
                )}
                {lr.from && lr.to && (
                  <> · {lr.from} → {lr.to}</>
                )}
                {statusForm.currentLocation && (
                  <> · Now at: <span className="font-medium">{statusForm.currentLocation}</span></>
                )}
              </p>
            </div>
            {statusForm.status === 'Reached Destination' && (
              <Button size="sm" onClick={() => navigate(`/operations/delivery-complete?lr=${encodeURIComponent(lrNumber)}`)}>
                Go to Delivery
              </Button>
            )}
          </div>
        </div>

        <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <OpsWorkflowFlowBanner lrNumber={lrNumber} lr={lr} process={process} currentStep="in-transit" />
        </div>

        <TransitSection title="Trip Details" subtitle="Dispatch, vehicle and load summary" icon={Truck} className="mb-4">
          <div className="loading-slip-field-grid loading-slip-field-grid--5">
            <Input label="Dispatch / Trip No." value={delivery?.dispatchNo || delivery?.tripNo || '—'} readOnly />
            <Input label="Transit Pass" value={pass?.passNumber || '—'} readOnly />
            <Input label="Vehicle" value={pass?.vehicleNumber || lr.vehicle || '—'} readOnly />
            <Input label="Driver" value={pass?.driverName || lr.driver || '—'} readOnly />
            <Input label="Last Update" value={delivery?.lastUpdate?.slice?.(0, 16)?.replace('T', ' ') || '—'} readOnly />
            <Input label="Origin" value={pass?.routeFrom || lr.from || '—'} readOnly />
            <Input label="Destination" value={pass?.routeTo || lr.to || '—'} readOnly />
            <Input label="Packages" readOnly value={String(pkg.packages)} />
            <Input label="Weight (Kg)" readOnly value={String(pkg.weight)} />
            <Input label="LR Status" value={lr.status || '—'} readOnly />
          </div>
        </TransitSection>

        <TransitSection title="Update Status" subtitle="Current in-transit status and location" icon={Route} className="mb-4">
          <div className="loading-slip-field-grid loading-slip-field-grid--4">
            <Select label="In-Transit Status" options={IN_TRANSIT_STATUSES} value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))} />
            <Input label="Current Location" value={statusForm.currentLocation} onChange={(e) => setStatusForm((f) => ({ ...f, currentLocation: e.target.value }))} />
          </div>
        </TransitSection>

        <TransitSection
          title="Add Checkpoint"
          subtitle="Log route progress with location, time and KM"
          icon={MapPin}
          className="mb-4"
          action={<Button size="sm" icon={Plus} onClick={addCheckpoint} disabled={saving}>Add Checkpoint</Button>}
        >
          <div className="loading-slip-field-grid loading-slip-field-grid--5">
            <Input label="Location *" value={checkpointForm.location} onChange={(e) => setCheckpointForm((f) => ({ ...f, location: e.target.value }))} />
            <Input label="Date" type="date" value={checkpointForm.date} onChange={(e) => setCheckpointForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label="Time" type="time" value={checkpointForm.time} onChange={(e) => setCheckpointForm((f) => ({ ...f, time: e.target.value }))} />
            <Input label="KM" type="number" min="0" value={checkpointForm.km} onChange={(e) => setCheckpointForm((f) => ({ ...f, km: e.target.value }))} />
            <Select label="Status" options={['Departed', 'Passed', 'Delayed', 'Stopped']} value={checkpointForm.status} onChange={(e) => setCheckpointForm((f) => ({ ...f, status: e.target.value }))} />
          </div>
          <Textarea className="mt-3" label="Remarks" rows={2} maxLength={120} value={checkpointForm.remarks} onChange={(e) => setCheckpointForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Toll crossed, traffic delay, rest stop..." />
        </TransitSection>

        <TransitSection title="Checkpoints" subtitle="Recorded route checkpoints" icon={MapPin} className="mb-4" collapsible defaultOpen={checkpoints.length > 0}>
          <CheckpointTable checkpoints={checkpoints} />
        </TransitSection>

        <TransitSection title="Timeline" subtitle="Status history and checkpoint events" icon={History} collapsible defaultOpen={false}>
          <OpsTimeline rows={timeline} />
        </TransitSection>
      </div>

      <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
        <LrEntryActionButtons
          saving={saving}
          onClear={handleClear}
          onCancel={handleCancel}
          onPreview={() => {}}
          onSave={updateStatus}
          onSavePrint={updateStatus}
          prependActions={(
            <Button type="button" onClick={updateStatus} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              Update Status
            </Button>
          )}
          financialSummary={(
            <InTransitSummary
              packages={pkg.packages}
              weight={pkg.weight}
              status={inTransitStatus}
              location={statusForm.currentLocation}
            />
          )}
        />
      </footer>
    </div>
  )
}

export default function InTransitPage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="In Transit"
      stage="dispatched"
      processStep="delivery"
      basePath="/operations/in-transit"
      listPath="/operations/in-transit/list"
      queueHint="Select a dispatched / in-transit LR to update location and checkpoints."
      allowBlankEntry
    >
      {(ctx) => <InTransitFormShell {...ctx} />}
    </OpsLrQueueGate>
  )
}
