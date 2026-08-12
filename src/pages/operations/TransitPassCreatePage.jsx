import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import OpsWorkflowFlowBanner from '../../components/ops/OpsWorkflowFlowBanner'
import TransitPassSelectLrModal from '../../components/ops/TransitPassSelectLrModal'
import TransitPassSummary from '../../components/ops/TransitPassSummary'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import { OpsSignaturePad, useOpsExtended } from '../../components/ops/OpsPhase2Parts'
import {
  FileBadge, Truck, Route, ArrowLeft, Send, XCircle, Plus,
  ChevronDown, ChevronRight, ClipboardList, Package,
} from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { formatLrDate, parsePackagesWeight } from '../../utils/lrDisplayHelpers'
import { deriveTransitPassStatus, mergeExtendedData } from '../../utils/opsWorkflowUtils'
import { usePrint } from '../../context/PrintContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'

function PassSection({
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

function TransitPassLrTable({ rows, totals }) {
  if (!rows?.length) {
    return (
      <div className="loading-slip-empty-table rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-900/50">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No LR linked</p>
      </div>
    )
  }

  return (
    <div className="loading-slip-table-wrap overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="loading-slip-table w-full min-w-[880px] text-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>LR No.</th>
            <th>LR Date</th>
            <th>Customer</th>
            <th>Consignee</th>
            <th>Destination</th>
            <th className="text-right">Packages</th>
            <th className="text-right">Weight (Kg)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.lrNumber || i}>
              <td className="text-slate-500">{i + 1}</td>
              <td className="font-semibold text-primary">{r.lrNumber}</td>
              <td>{r.lrDate}</td>
              <td>{r.customer || '—'}</td>
              <td>{r.consignee || '—'}</td>
              <td>{r.destination || '—'}</td>
              <td className="text-right tabular-nums">{r.packages}</td>
              <td className="text-right tabular-nums">{r.actualWeight}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="loading-slip-table-total">
            <td colSpan={6} className="text-right font-semibold">Total</td>
            <td className="text-right tabular-nums font-semibold">{totals.packages}</td>
            <td className="text-right tabular-nums font-semibold">{totals.actualWeight}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function TransitPassBlankEntry({ onBack, onSelectLr }) {
  const [selectOpen, setSelectOpen] = useState(false)

  return (
    <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="Transit Pass"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Transit Pass', path: '/operations/transit-pass/list' },
          { label: 'New Transit Pass' },
        ]}
      />
      <div className="loading-slip-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        <div className="loading-slip-hero mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Transit Pass</p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">New Transit Pass</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                No LR selected — click Select LR to begin.
              </p>
            </div>
            <Button icon={Plus} onClick={() => setSelectOpen(true)}>Select LR</Button>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center dark:border-slate-600 dark:bg-slate-800/40">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Choose an LR with loading completed to generate a new transit pass.
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
      <TransitPassSelectLrModal
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

function defaultVia(lr, pass) {
  if (pass?.viaPoints) return pass.viaPoints
  if (!lr) return ''
  return `${lr.from || ''} - ${lr.to || ''}`.trim()
}

function statusBadgeVariant(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('ready') || s.includes('generated')) return 'Paid'
  if (s.includes('cancel')) return 'outline'
  return 'Pending'
}

function TransitPassFormShell(props) {
  const [, setSearchParams] = useSearchParams()

  if (props.isBlank && !props.lrNumber) {
    return (
      <TransitPassBlankEntry
        onBack={props.onBack}
        onSelectLr={(num) => setSearchParams({ lr: num })}
      />
    )
  }

  if (!props.lr || !props.lrNumber) {
    return (
      <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <ERPPageTitle module="Operations" title="Transit Pass" breadcrumb={[{ label: 'Loading…' }]} />
        <p className="p-4 text-sm text-slate-500">Loading transit pass…</p>
      </div>
    )
  }

  return <TransitPassForm {...props} />
}

function TransitPassForm({ lrNumber, lr, process, saving, runSave, onBack }) {
  const navigate = useNavigate()
  const { company, print } = usePrint()
  const pass = process?.transitPass
  const ext = pass?.extendedData || {}
  const loadingSheet = process?.loadingSheet

  const [form, setForm] = useState({
    passNo: pass?.passNumber || '—',
    via: defaultVia(lr, pass),
    sealNo: pass?.sealNumber || loadingSheet?.sealNumber || '',
    sealCondition: pass?.sealCondition || 'Intact',
    transitType: pass?.transitType || 'By Road',
    expectedDelivery: pass?.expectedDelivery || '',
    remarks: pass?.remarks || '',
  })
  const [extended, mergeExt] = useOpsExtended({ signatures: ext.signatures || {} })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (pass) {
      setForm({
        passNo: pass.passNumber || '—',
        via: defaultVia(lr, pass),
        sealNo: pass.sealNumber || loadingSheet?.sealNumber || '',
        sealCondition: pass.sealCondition || 'Intact',
        transitType: pass.transitType || 'By Road',
        expectedDelivery: pass.expectedDelivery || '',
        remarks: pass.remarks || '',
      })
      mergeExt({ signatures: pass.extendedData?.signatures || {} })
    }
  }, [pass, lr, loadingSheet?.sealNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    const items = process?.loadingSheet?.items?.length ? process.loadingSheet.items : [{ lrNumber: lr.lrNumber }]
    return items.map((i) => {
      const pkg = parsePackagesWeight(lr.quantity)
      return {
        lrNumber: i.lrNumber || lr.lrNumber,
        lrDate: formatLrDate(lr.lrDate),
        customer: lr.customerName || lr.consignor,
        consignee: lr.consignee,
        destination: lr.to,
        packages: pkg.packages,
        actualWeight: pkg.weight,
        chargedWeight: pkg.weight,
      }
    })
  }, [process, lr])

  const totals = useMemo(() => ({
    packages: rows.reduce((s, r) => s + Number(r.packages || 0), 0),
    actualWeight: rows.reduce((s, r) => s + parseFloat(r.actualWeight || 0), 0).toFixed(3),
    chargedWeight: rows.reduce((s, r) => s + parseFloat(r.chargedWeight || 0), 0).toFixed(3),
  }), [rows])

  const payload = () => ({
    viaPoints: form.via,
    sealNumber: form.sealNo,
    sealCondition: form.sealCondition,
    transitType: form.transitType,
    expectedDelivery: form.expectedDelivery || undefined,
    remarks: form.remarks,
    vehicleNumber: lr.vehicle || loadingSheet?.vehicleNumber || pass?.vehicleNumber || undefined,
    driverName: lr.driver || loadingSheet?.extendedData?.meta?.driver || pass?.driverName || undefined,
    routeFrom: lr.from || undefined,
    routeTo: lr.to || undefined,
    extendedData: mergeExtendedData(pass?.extendedData, { signatures: extended.signatures }),
  })

  const passStatus = deriveTransitPassStatus(lr, pass)
  const pageTitle = pass?.passNumber && pass.passNumber !== '—' ? pass.passNumber : 'New Transit Pass'
  const canDispatch = pass && passStatus !== 'Cancelled' && lr.status === 'Transit Pass Generated'

  const handleSave = () => runSave(pass ? 'Transit pass updated' : 'Transit pass generated', () =>
    lrProcessApi.createTransitPass(lrNumber, payload()))

  const handleSavePrint = async () => {
    await runSave(pass ? 'Transit pass updated' : 'Transit pass generated', () =>
      lrProcessApi.createTransitPass(lrNumber, payload()))
    handlePrint()
  }

  const handleReady = () => runSave('Marked ready for dispatch', () => {
    if (!pass) return lrProcessApi.createTransitPass(lrNumber, payload()).then(() => lrProcessApi.markTransitPassReady(lrNumber))
    return lrProcessApi.markTransitPassReady(lrNumber)
  })

  const handleCancelPass = () => {
    const reason = window.prompt('Cancellation reason (optional):') ?? ''
    runSave('Transit pass cancelled', () => lrProcessApi.cancelTransitPass(lrNumber, reason))
  }

  const handlePrint = async () => {
    if (!process?.transitPass) return
    await printModuleDocument({
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

  const handleClear = () => {
    setForm({
      passNo: pass?.passNumber || '—',
      via: defaultVia(lr, pass),
      sealNo: pass?.sealNumber || loadingSheet?.sealNumber || '',
      sealCondition: pass?.sealCondition || 'Intact',
      transitType: pass?.transitType || 'By Road',
      expectedDelivery: pass?.expectedDelivery || '',
      remarks: pass?.remarks || '',
    })
    mergeExt({ signatures: pass?.extendedData?.signatures || {} })
  }

  const handleCancel = () => navigate('/operations/transit-pass/list')
  const handlePreview = () => handlePrint()

  return (
    <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="Transit Pass"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Transit Pass', path: '/operations/transit-pass/list' },
          { label: pageTitle },
        ]}
      />

      <div className="loading-slip-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4" data-kbd-form-root>
        <div className="loading-slip-hero mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Transit Pass</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{pageTitle}</h1>
                <Badge variant={statusBadgeVariant(passStatus)}>{passStatus}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                LR: <span className="font-semibold text-primary">{lrNumber}</span>
                {loadingSheet?.sheetNumber && (
                  <> · Slip: <span className="font-medium">{loadingSheet.sheetNumber}</span></>
                )}
                {lr.from && lr.to && (
                  <> · {lr.from} → {lr.to}</>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" icon={ArrowLeft} onClick={onBack}>Back</Button>
              {canDispatch && (
                <Button size="sm" variant="outline" onClick={handleReady} disabled={saving}>Ready for Dispatch</Button>
              )}
              {canDispatch && (
                <Button size="sm" onClick={() => navigate(`/operations/dispatch?lr=${encodeURIComponent(lrNumber)}`)} icon={Send}>
                  Create Dispatch
                </Button>
              )}
              {pass && passStatus !== 'Cancelled' && (
                <Button size="sm" variant="outline" icon={XCircle} className="border-red-200 text-red-600" onClick={handleCancelPass} disabled={saving}>
                  Cancel Pass
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <OpsWorkflowFlowBanner lrNumber={lrNumber} lr={lr} process={process} currentStep="transit" />
        </div>

        <PassSection title="Pass Details" subtitle="Document reference and issue information" icon={FileBadge} className="mb-4">
          <div className="loading-slip-field-grid loading-slip-field-grid--5">
            <Input label="Pass No." value={form.passNo} readOnly />
            <Input label="Loading Slip No." value={loadingSheet?.sheetNumber || '—'} readOnly />
            <Input label="LR No." value={lrNumber} readOnly />
            <Input label="Issue Date" value={pass?.issueDate || new Date().toISOString().slice(0, 10)} readOnly />
            <Input label="Branch" value={lr.branchName || '—'} readOnly />
            <Input label="From" value={lr.from || '—'} readOnly />
            <Input label="To" value={lr.to || '—'} readOnly />
            <Input label="Vehicle No." value={lr.vehicle || pass?.vehicleNumber || loadingSheet?.vehicleNumber || '—'} readOnly />
            <Input label="Driver" value={lr.driver || pass?.driverName || loadingSheet?.extendedData?.meta?.driver || '—'} readOnly />
            <Input label="Pass Status" value={passStatus} readOnly />
          </div>
        </PassSection>

        <div className="loading-slip-two-col mb-4">
          <PassSection title="Trip Summary" subtitle="Packages and weight on this transit" icon={Package}>
            <div className="loading-slip-field-grid loading-slip-field-grid--4">
              <Input label="LR Count" readOnly value={String(rows.length)} />
              <Input label="Total Packages" readOnly value={String(totals.packages)} />
              <Input label="Actual Weight (Kg)" readOnly value={totals.actualWeight} />
              <Input label="Charged Weight (Kg)" readOnly value={totals.chargedWeight} />
            </div>
          </PassSection>
          <PassSection title="Vehicle & Driver" subtitle="From loading slip / LR" icon={Truck}>
            <div className="loading-slip-field-grid">
              <Input label="Vehicle No." value={lr.vehicle || pass?.vehicleNumber || loadingSheet?.vehicleNumber || '—'} readOnly />
              <Input label="Driver Name" value={lr.driver || pass?.driverName || loadingSheet?.extendedData?.meta?.driver || '—'} readOnly />
            </div>
          </PassSection>
        </div>

        <PassSection title="Route & Schedule" subtitle="Transit route, seal and expected delivery" icon={Route} className="mb-4">
          <div className="loading-slip-field-grid loading-slip-field-grid--5">
            <Input label="Via / Route" value={form.via} onChange={(e) => u('via', e.target.value)} />
            <Input label="Seal No." value={form.sealNo} onChange={(e) => u('sealNo', e.target.value)} />
            <Select label="Seal Condition" options={['Intact', 'Broken', 'Missing']} value={form.sealCondition} onChange={(e) => u('sealCondition', e.target.value)} />
            <Select label="Transit Type" options={['By Road', 'By Rail', 'Multimodal']} value={form.transitType} onChange={(e) => u('transitType', e.target.value)} />
            <Input label="Expected Delivery" type="date" value={form.expectedDelivery} onChange={(e) => u('expectedDelivery', e.target.value)} />
          </div>
        </PassSection>

        <PassSection title="LR Details" subtitle="All LRs included in this transit pass" icon={ClipboardList} className="mb-4">
          <TransitPassLrTable rows={rows} totals={totals} />
        </PassSection>

        <div className="loading-slip-bottom-grid">
          <PassSection title="Authorization" subtitle="Gate officer and security sign-off" collapsible defaultOpen={false}>
            <div className="loading-slip-signatures">
              <OpsSignaturePad label="Gate Officer" value={extended.signatures?.gateOfficer} onChange={(v) => mergeExt({ signatures: { ...extended.signatures, gateOfficer: v } })} height={100} />
              <OpsSignaturePad label="Security / Authorizer" value={extended.signatures?.authorizer} onChange={(v) => mergeExt({ signatures: { ...extended.signatures, authorizer: v } })} height={100} />
            </div>
          </PassSection>
          <PassSection title="Remarks" subtitle="Notes for gate and dispatch team" collapsible defaultOpen={false}>
            <Textarea rows={8} maxLength={200} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} placeholder="Vehicle cleared for dispatch. All seals verified..." />
          </PassSection>
        </div>
      </div>

      <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
        <LrEntryActionButtons
          saving={saving}
          onClear={handleClear}
          onCancel={handleCancel}
          onPreview={handlePreview}
          onSave={handleSave}
          onSavePrint={handleSavePrint}
          financialSummary={(
            <TransitPassSummary
              lrCount={rows.length}
              packages={totals.packages}
              chargedWeight={totals.chargedWeight}
              status={passStatus}
            />
          )}
        />
      </footer>
    </div>
  )
}

export default function TransitPassCreatePage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="Transit Pass"
      stage="vehicle-assigned"
      processStep="transit"
      basePath="/operations/transit-pass"
      listPath="/operations/transit-pass/list"
      queueHint="Select an LR with vehicle assigned to generate or update a transit pass (CRUD)."
      allowBlankEntry
    >
      {(ctx) => <TransitPassFormShell {...ctx} />}
    </OpsLrQueueGate>
  )
}
