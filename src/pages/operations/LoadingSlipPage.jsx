import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Input, { Textarea } from '../../components/ui/Input'
import BranchSelect from '../../components/ui/BranchSelect'
import Button from '../../components/ui/Button'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import LoadingSlipLrTable from '../../components/ops/LoadingSlipLrTable'
import LoadingSlipAddLrModal from '../../components/ops/LoadingSlipAddLrModal'
import LoadingSlipSummary from '../../components/ops/LoadingSlipSummary'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import VehicleMasterSelect from '../../components/masters/VehicleMasterSelect'
import DriverMasterSelect from '../../components/masters/DriverMasterSelect'
import {
  LOADING_CHECKLIST, OpsAttachments, OpsChecklist, OpsSignaturePad, useOpsExtended,
} from '../../components/ops/OpsPhase2Parts'
import {
  ClipboardList, Truck, MapPin, User, Plus,
  Route, ChevronDown, ChevronRight,
} from 'lucide-react'
import { lrApi, lrProcessApi } from '../../services/api'
import {
  emptyLoadingSlipForm, mapLoadingSheetItems, mapLrToLoadingRow, toLocalInput,
} from '../../utils/loadingSlipHelpers'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'

function SlipFieldLabel({ children, required }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
      {required ? ' *' : null}
    </label>
  )
}

function num(val) {
  const n = parseFloat(String(val ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function SlipSection({
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

function LoadingSlipForm({
  lrNumber, lr, process, saving, runSave, reload, isBlank: isBlankEntry,
}) {
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const sheet = process?.loadingSheet
  const ext = sheet?.extendedData || {}

  const [form, setForm] = useState(() => {
    if (lr) {
      return {
        ...emptyLoadingSlipForm(),
        slipNo: sheet?.sheetNumber || '—',
        dateTime: toLocalInput(sheet?.loadingAt) || emptyLoadingSlipForm().dateTime,
        branch: lr.branchName || '',
        plannedBy: sheet?.supervisorName || lr.createdBy || '',
        loadingStatus: sheet?.loadingStatus || 'Draft',
        loadingCompletedAt: toLocalInput(sheet?.loadingAt) || emptyLoadingSlipForm().loadingCompletedAt,
        vehicleNo: lr.vehicle || sheet?.vehicleNumber || '',
        vehicleType: ext.meta?.vehicleType || ext.vehicleType || '',
        driver: lr.driver || '',
        driverMobile: ext.meta?.driverMobile || ext.driverMobile || '',
        transporter: ext.meta?.transporter || ext.transporter || '',
        tripNo: ext.meta?.tripNo || sheet?.tripNo || '',
        routeFrom: lr.from || '',
        routeTo: lr.to || '',
        routeVia: ext.meta?.routeVia || ext.routeVia || '',
        expectedDelivery: ext.meta?.expectedDelivery || ext.expectedDelivery || '',
        loader: sheet?.loaderName || '',
        loaderMobile: ext.meta?.loaderMobile || ext.loaderMobile || '',
        supervisor: sheet?.supervisorName || '',
        supervisorMobile: ext.meta?.supervisorMobile || ext.supervisorMobile || '',
        sealNo: sheet?.sealNumber || '',
        remarks: sheet?.remarks || '',
        loadingLocation: sheet?.loadingLocation || lr.from || '',
      }
    }
    return emptyLoadingSlipForm()
  })

  const [rows, setRows] = useState(() => (lr && process ? mapLoadingSheetItems(process, lr) : []))
  const [extended, mergeExt] = useOpsExtended({
    checklist: ext.checklist || {},
    signatures: ext.signatures || {},
    meta: ext.meta || {},
  })
  const [addLrOpen, setAddLrOpen] = useState(false)
  const [addingLrs, setAddingLrs] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [anchorLrCache, setAnchorLrCache] = useState(lr)

  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!lr || !process) return

    setAnchorLrCache(lr)
    const sheetItems = mapLoadingSheetItems(process, lr)
    setRows(sheetItems)

    const s = process.loadingSheet
    const x = s?.extendedData || {}
    setForm((f) => ({
      ...f,
      slipNo: s?.sheetNumber || f.slipNo,
      branch: lr.branchName || f.branch,
      plannedBy: s?.supervisorName || lr.createdBy || f.plannedBy,
      loadingStatus: s?.loadingStatus || f.loadingStatus,
      loadingCompletedAt: s?.loadingAt ? toLocalInput(s.loadingAt) : f.loadingCompletedAt,
      vehicleNo: lr.vehicle || s?.vehicleNumber || f.vehicleNo,
      vehicleType: x.meta?.vehicleType || x.vehicleType || f.vehicleType,
      driver: lr.driver || f.driver,
      driverMobile: x.meta?.driverMobile || x.driverMobile || f.driverMobile,
      routeFrom: lr.from || f.routeFrom,
      routeTo: lr.to || f.routeTo,
      loadingLocation: s?.loadingLocation || lr.from || f.loadingLocation,
      sealNo: s?.sealNumber || f.sealNo,
      remarks: s?.remarks || f.remarks,
      loader: s?.loaderName || f.loader,
      supervisor: s?.supervisorName || f.supervisor,
      dateTime: s?.loadingAt ? toLocalInput(s.loadingAt) : f.dateTime,
    }))
    mergeExt({
      checklist: s?.extendedData?.checklist || {},
      signatures: s?.extendedData?.signatures || {},
      meta: s?.extendedData?.meta || {},
    })
  }, [process, lr, lrNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const anchorLr = lrNumber || rows[0]?.lrNumber

  const totals = useMemo(() => ({
    itemCount: rows.reduce((s, r) => s + num(r.items), 0),
    packages: rows.reduce((s, r) => s + num(r.packages), 0),
    actualWeight: rows.reduce((s, r) => s + num(r.actualWeight), 0).toFixed(3),
    chargedWeight: rows.reduce((s, r) => s + num(r.chargedWeight), 0).toFixed(3),
    volume: rows.reduce((s, r) => s + num(r.volume), 0).toFixed(3),
  }), [rows])

  const loadedCount = rows.filter((r) => r.loaded).length

  const applyLrHints = useCallback((lrData) => {
    if (!lrData) return
    setForm((f) => ({
      ...f,
      vehicleNo: f.vehicleNo || lrData.vehicle || '',
      driver: f.driver || lrData.driver || '',
      routeFrom: f.routeFrom || lrData.from || '',
      routeTo: f.routeTo || lrData.to || '',
      loadingLocation: f.loadingLocation || lrData.from || '',
      branch: f.branch || lrData.branchName || '',
    }))
    setAnchorLrCache((prev) => prev || lrData)
  }, [])

  const handleAddLrs = async (lrNumbers) => {
    setAddingLrs(true)
    try {
      const added = []
      for (const num of lrNumbers) {
        if (rows.some((r) => r.lrNumber === num)) {
          toast({ title: 'Duplicate LR', message: `${num} is already on this slip.`, type: 'warning' })
          continue
        }
        const lrData = await lrApi.get(num)
        added.push(mapLrToLoadingRow(lrData))
      }
      if (added.length === 0) return
      setRows((prev) => [...prev, ...added])
      setFieldErrors((e) => ({ ...e, lr: undefined }))
      if (added.length) applyLrHints(await lrApi.get(added[0].lrNumber))
      setAddLrOpen(false)
      toast({ title: 'LR added', message: `${added.length} LR(s) added to loading slip.`, type: 'success' })
    } catch (err) {
      toast({ title: 'Failed to load LR', message: err.message, type: 'error' })
    } finally {
      setAddingLrs(false)
    }
  }

  const toggleRowLoaded = (index) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, loaded: !r.loaded } : r)))
  }

  const handleDeleteRow = (index, row) => {
    if (!window.confirm(`Remove ${row.lrNumber} from this loading slip?`)) return
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const validate = () => {
    const errors = {}
    if (rows.length === 0) errors.lr = 'Add at least one LR before saving.'
    if (!form.vehicleNo?.trim()) errors.vehicle = 'Select vehicle from Vehicle master.'
    if (!form.driver?.trim()) errors.driver = 'Select driver from Driver master.'
    if (!form.branch?.trim()) errors.branch = 'Select branch from Branch master.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      toast({ title: 'Validation', message: Object.values(errors)[0], type: 'warning' })
      return false
    }
    return true
  }

  const buildPayload = (statusOverride) => {
    const anchor = anchorLrCache || lr
    return {
      loadingLocation: form.loadingLocation,
      materialQuantity: anchor?.quantity || '',
      loadingStatus: statusOverride || 'Completed',
      remarks: form.remarks,
      businessType: process?.businessType || anchor?.businessType || 'FTL',
      lrNumbers: rows.map((r) => r.lrNumber),
      vehicleNumber: form.vehicleNo,
      loaderName: form.loader,
      supervisorName: form.supervisor || form.plannedBy,
      sealNumber: form.sealNo,
      loadingAt: form.loadingCompletedAt ? new Date(form.loadingCompletedAt).toISOString() : new Date().toISOString(),
      extendedData: {
        checklist: extended.checklist,
        signatures: extended.signatures,
        meta: {
          ...extended.meta,
          vehicleType: form.vehicleType,
          driverMobile: form.driverMobile,
          transporter: form.transporter,
          tripNo: form.tripNo,
          routeVia: form.routeVia,
          expectedDelivery: form.expectedDelivery,
          loaderMobile: form.loaderMobile,
          supervisorMobile: form.supervisorMobile,
          plannedBy: form.plannedBy,
          branchId: form.branchId,
          rowStates: rows.map((r) => ({ lrNumber: r.lrNumber, loaded: r.loaded })),
        },
      },
    }
  }

  const printSlipDocument = async () => {
    const anchor = rows[0]
    const from = form.routeFrom || anchor?.destination || ''
    const to = form.routeTo || ''
    await printModuleDocument({
      moduleCode: PRINT_MODULE_CODES.LOADING_SLIP,
      company,
      print,
      documentData: {
        slip: {
          sheetNumber: form.slipNo,
          slipNo: form.slipNo,
          loadingDate: form.dateTime || form.loadingCompletedAt,
          lrNumber: anchor?.lrNumber,
          vehicle: form.vehicleNo,
          driver: form.driver,
          fromCity: form.routeFrom,
          toCity: form.routeTo,
          tripNo: form.tripNo,
          totalPackages: rows.reduce((s, r) => s + num(r.packages), 0),
          totalWeight: rows.reduce((s, r) => s + num(r.actualWeight ?? r.chargedWeight), 0),
          status: form.loadingStatus,
          loaderName: form.loader,
          supervisorName: form.supervisor,
        },
        lr: {
          lrNumber: anchor?.lrNumber,
          lrDate: form.dateTime,
          vehicle: form.vehicleNo,
          driver: form.driver,
          from,
          to,
          consignor: anchor?.customer,
          consignee: anchor?.consignee,
        },
      },
    })
  }

  const handleSave = async (message = 'Loading slip saved', statusOverride, andPrint = false) => {
    if (!validate()) return
    const anchor = rows[0]?.lrNumber
    if (!anchor) return

    const saveFn = () => lrProcessApi.saveLoadingSheet(anchor, buildPayload(statusOverride))

    if (lrNumber && runSave) {
      await runSave(message, saveFn)
      if (andPrint) await printSlipDocument()
      return
    }

    try {
      await saveFn()
      toast({ title: message, type: 'success' })
      setSearchParams({ lr: anchor })
      if (andPrint) await printSlipDocument()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    }
  }

  const handleClear = () => {
    setForm(emptyLoadingSlipForm())
    setRows([])
    setFieldErrors({})
    setAnchorLrCache(null)
    mergeExt({ checklist: {}, signatures: {}, meta: {} })
  }

  const handleCancel = () => navigate('/operations/loading-slip/list')

  const handlePreview = () => { printSlipDocument() }

  const isSaving = saving || addingLrs

  const docs = process?.deliveryDocuments || []
  const pageTitle = isBlankEntry && !lrNumber ? 'New Loading Slip' : (form.slipNo !== '—' ? form.slipNo : lrNumber || 'Loading Slip')

  return (
    <div className="loading-slip-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Operations"
        title="Loading Slip"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Loading Slip', path: '/operations/loading-slip/list' },
          { label: pageTitle },
        ]}
      />

      <div className="loading-slip-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4" data-kbd-form-root>
        <div className="loading-slip-hero mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Loading Slip</p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{pageTitle}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {rows.length === 0
                ? 'No LR selected — click Add LR to begin.'
                : (
                  <>
                    {anchorLr && <>Anchor LR: <span className="font-semibold text-primary">{anchorLr}</span></>}
                    {form.routeFrom && form.routeTo && (
                      <> · {form.routeFrom} → {form.routeTo}</>
                    )}
                  </>
                )}
            </p>
          </div>
        </div>

        <SlipSection title="Slip Details" subtitle="Document reference and scheduling" icon={ClipboardList} className="mb-4">
          <div className="loading-slip-field-grid loading-slip-field-grid--5">
            <Input label="Loading Slip No." value={form.slipNo} readOnly />
            <Input label="Date & Time" type="datetime-local" value={form.dateTime} onChange={(e) => u('dateTime', e.target.value)} />
            <BranchSelect
              label="Branch / Warehouse"
              value={form.branch}
              error={fieldErrors.branch}
              placeholder="Select branch…"
              onChange={(v) => {
                u('branch', v)
                setFieldErrors((e) => ({ ...e, branch: undefined }))
              }}
            />
            <Input label="Planned By" value={form.plannedBy} onChange={(e) => u('plannedBy', e.target.value)} />
            <Input label="Loading Completed At" type="datetime-local" value={form.loadingCompletedAt} onChange={(e) => u('loadingCompletedAt', e.target.value)} />
          </div>
        </SlipSection>

        <div className="loading-slip-two-col mb-4">
          <SlipSection title="Vehicle Details" subtitle="Truck, driver and transporter" icon={Truck}>
            <div className="loading-slip-field-grid">
              <div className="loading-slip-lookup">
                <SlipFieldLabel>Vehicle No.</SlipFieldLabel>
                <VehicleMasterSelect
                  label={false}
                  variant="dense"
                  displayValue={form.vehicleNo}
                  placeholder="Search vehicle number…"
                  onSelect={(v) => {
                    u('vehicleNo', v.number || '')
                    u('vehicleId', v.id)
                    u('vehicleType', v.type || v.model || form.vehicleType)
                    setFieldErrors((e) => ({ ...e, vehicle: undefined }))
                  }}
                />
                {fieldErrors.vehicle && <p className="mt-1 text-xs text-red-500">{fieldErrors.vehicle}</p>}
              </div>
              <Input label="Vehicle Type" value={form.vehicleType} onChange={(e) => u('vehicleType', e.target.value)} placeholder="14 FEET" />
              <div className="loading-slip-lookup">
                <SlipFieldLabel>Driver Name</SlipFieldLabel>
                <DriverMasterSelect
                  label={false}
                  variant="dense"
                  displayValue={form.driver}
                  placeholder="Search driver name…"
                  onSelect={(d) => {
                    u('driver', d.name || '')
                    u('driverId', d.id)
                    u('driverMobile', d.phone || form.driverMobile)
                    setFieldErrors((e) => ({ ...e, driver: undefined }))
                  }}
                />
                {fieldErrors.driver && <p className="mt-1 text-xs text-red-500">{fieldErrors.driver}</p>}
              </div>
              <Input label="Driver Mobile" value={form.driverMobile} onChange={(e) => u('driverMobile', e.target.value)} />
              <Input label="Transporter" className="sm:col-span-2" value={form.transporter} onChange={(e) => u('transporter', e.target.value)} />
              <Input label="Loading Location" className="sm:col-span-2" value={form.loadingLocation} onChange={(e) => u('loadingLocation', e.target.value)} />
            </div>
          </SlipSection>

          <SlipSection title="Trip / Route" subtitle="Delivery plan and route" icon={Route}>
            <div className="loading-slip-field-grid">
              <Input label="Trip No." value={form.tripNo} onChange={(e) => u('tripNo', e.target.value)} />
              <Input label="Expected Delivery" type="date" value={form.expectedDelivery} onChange={(e) => u('expectedDelivery', e.target.value)} />
              <Input label="From" value={form.routeFrom} readOnly />
              <Input label="To" value={form.routeTo} readOnly />
              <Input label="Via / Route" className="sm:col-span-2" value={form.routeVia} onChange={(e) => u('routeVia', e.target.value)} />
            </div>
          </SlipSection>
        </div>

        <SlipSection title="Loader & Supervisor" subtitle="Ground staff on duty" icon={User} className="mb-4">
          <div className="loading-slip-field-grid loading-slip-field-grid--4">
            <Input label="Loader Name" value={form.loader} onChange={(e) => u('loader', e.target.value)} />
            <Input label="Loader Mobile" value={form.loaderMobile} onChange={(e) => u('loaderMobile', e.target.value)} />
            <Input label="Supervisor Name" value={form.supervisor} onChange={(e) => u('supervisor', e.target.value)} />
            <Input label="Supervisor Mobile" value={form.supervisorMobile} onChange={(e) => u('supervisorMobile', e.target.value)} />
          </div>
        </SlipSection>

        <SlipSection
          title="LR Details to be Loaded"
          subtitle={rows.length ? `${loadedCount} of ${rows.length} marked loaded` : 'No LR selected'}
          icon={MapPin}
          className="mb-4"
          action={<Button size="sm" icon={Plus} onClick={() => setAddLrOpen(true)}>Add LR</Button>}
        >
          {fieldErrors.lr && (
            <p className="mb-2 text-sm text-amber-700 dark:text-amber-300">{fieldErrors.lr}</p>
          )}
          <LoadingSlipLrTable
            rows={rows}
            totals={totals}
            onToggleLoaded={toggleRowLoaded}
            onDelete={handleDeleteRow}
          />
        </SlipSection>

        <div className="loading-slip-bottom-grid mb-4">
          <SlipSection title="Loading Checklist" subtitle="Verify before dispatch" collapsible defaultOpen={false}>
            <div className="loading-slip-checklist">
              <OpsChecklist items={LOADING_CHECKLIST} values={extended.checklist} onChange={(v) => mergeExt({ checklist: v })} />
            </div>
            <Input label="Seal Number" className="mt-4" value={form.sealNo} onChange={(e) => u('sealNo', e.target.value)} />
          </SlipSection>

          <SlipSection title="Loading Notes" subtitle="Remarks for warehouse & driver" collapsible defaultOpen={false}>
            <Textarea rows={8} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} placeholder="All LR scanned and verified. Load secured with tarpaulin..." />
          </SlipSection>

          <SlipSection title="Attachments" subtitle="Photos, documents, weighbridge slips" collapsible defaultOpen={false}>
            {anchorLr ? (
              <OpsAttachments
                lrNumber={anchorLr}
                documents={docs.filter((d) => d.docType?.includes('Loading'))}
                docType="Loading Document"
                uploadFn={lrProcessApi.uploadDeliveryDocument}
                onUploaded={reload}
              />
            ) : (
              <p className="text-sm text-slate-500">Add at least one LR to upload attachments.</p>
            )}
          </SlipSection>

          <SlipSection title="Signatures" subtitle="Loader, supervisor and driver sign-off" collapsible defaultOpen={false}>
            <div className="loading-slip-signatures">
              <OpsSignaturePad label="Loader Signature" value={extended.signatures?.loader} onChange={(v) => mergeExt({ signatures: { ...extended.signatures, loader: v } })} height={100} />
              <OpsSignaturePad label="Supervisor Signature" value={extended.signatures?.supervisor} onChange={(v) => mergeExt({ signatures: { ...extended.signatures, supervisor: v } })} height={100} />
              <OpsSignaturePad label="Driver Signature" value={extended.signatures?.driver} onChange={(v) => mergeExt({ signatures: { ...extended.signatures, driver: v } })} height={100} />
            </div>
          </SlipSection>
        </div>
      </div>

      <LoadingSlipAddLrModal
        open={addLrOpen}
        onClose={() => setAddLrOpen(false)}
        onConfirm={handleAddLrs}
        excludeLrNumbers={rows.map((r) => r.lrNumber)}
        loading={addingLrs}
      />

      <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
        <LrEntryActionButtons
          saving={isSaving}
          onClear={handleClear}
          onCancel={handleCancel}
          onPreview={handlePreview}
          onSave={() => handleSave()}
          onSavePrint={() => handleSave('Saved & ready to print', undefined, true)}
          financialSummary={(
            <LoadingSlipSummary
              totalLr={rows.length}
              loaded={rows.length ? `${loadedCount} / ${rows.length}` : '—'}
              packages={totals.packages}
              actualWeight={totals.actualWeight}
              chargedWeight={totals.chargedWeight}
            />
          )}
        />
      </footer>
    </div>
  )
}

export default function LoadingSlipPage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="Loading Slip"
      stage="loading-pending"
      processStep="loading"
      basePath="/operations/loading-slip"
      queueHint="Select an LR pending loading to create or update a loading slip."
      listPath="/operations/loading-slip/list"
      allowBlankEntry
    >
      {(ctx) => <LoadingSlipForm {...ctx} />}
    </OpsLrQueueGate>
  )
}
