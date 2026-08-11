import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import LrEntryFormLayout, {
  buildLrApiPayload,
  emptyLrEntryForm,
  formToPreviewLr,
  mapLrDtoToEntryForm,
} from '../../components/lr/LrEntryFormLayout'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import LrEntryFinancialSummary from '../../components/lr/entry/LrEntryFinancialSummary'
import { computeLrFinancials } from '../../utils/lrEntryFinancials'
import LrStatusFlow from '../../components/lr/LrStatusFlow'
import { consignorsApi, consigneesApi, lrApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { fromDocPath, lrProcessPath } from '../../utils/docPath'
import FormValidationPopup from '../../components/ui/FormValidationPopup'
import { scrollToFirstFieldError, focusFirstFieldError } from '../../utils/formValidationFocus'
import { syncLrRouteFields } from '../../utils/partyMasterLr'
import { useKeyboardPageActions, useAutoFocus } from '../../hooks/useKeyboardPageActions'
import { ArrowLeft, Loader2, Workflow } from 'lucide-react'

function buildFieldErrors(form) {
  const errors = {}
  if (!form.lrDate?.trim()) errors.lrDate = 'LR Date is required.'
  if (!form.consignorId && !form.consignor?.trim()) errors.consignor = 'Please select Consignor.'
  if (!form.consigneeId && !form.consignee?.trim()) errors.consignee = 'Please select Consignee.'
  if (!form.from?.trim() && !form.pickupCity?.trim()) errors.from = 'Pickup city is required.'
  if (!form.to?.trim()) errors.to = 'Delivery city is required.'
  return errors
}

async function hydratePartyContacts(form) {
  const next = { ...form }
  if (form.consignorId) {
    try {
      const c = await consignorsApi.get(form.consignorId)
      Object.assign(next, {
        consignorContact: c.contact ?? next.consignorContact ?? '',
        consignorPhone: c.phone ?? next.consignorPhone ?? '',
        consignorGst: c.gst ?? next.consignorGst ?? '',
        consignorAddress: c.address ?? next.consignorAddress ?? '',
      })
    } catch { /* legacy LR without master row */ }
  }
  if (form.consigneeId) {
    try {
      const c = await consigneesApi.get(form.consigneeId)
      Object.assign(next, {
        consigneeContact: c.contact ?? next.consigneeContact ?? '',
        consigneePhone: c.phone ?? next.consigneePhone ?? '',
        consigneeGst: c.gst ?? next.consigneeGst ?? '',
        consigneeAddress: c.address ?? next.consigneeAddress ?? '',
      })
    } catch { /* legacy */ }
  }
  if (!next.billingParty) {
    next.billingParty = next.customerName || next.consignor || ''
  }
  return next
}

export default function EditLR() {
  const { lrNumber: rawLrNumber } = useParams()
  const lrNumber = fromDocPath(rawLrNumber)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()

  const [form, setForm] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [lrStatus, setLrStatus] = useState('LR Created')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [validationOpen, setValidationOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const formActionsRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setForm(null)
    setSnapshot(null)

    lrApi.get(lrNumber)
      .then(async (lr) => {
        if (cancelled) return
        const mapped = await hydratePartyContacts(mapLrDtoToEntryForm(lr))
        setForm(mapped)
        setSnapshot(mapped)
        setLrStatus(lr.status || 'LR Created')
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Failed to load LR')
          toast({ title: 'Load failed', message: err.message, type: 'error' })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [lrNumber, toast])

  useEffect(() => {
    if (validationOpen && Object.keys(fieldErrors).length === 0) {
      setValidationOpen(false)
    }
  }, [fieldErrors, validationOpen])

  const clearFieldErrors = useCallback((keys) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      keys.forEach((key) => { delete next[key] })
      return next
    })
  }, [])

  const update = useCallback((field, value) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      if (field === 'from' || field === 'pickupCity') delete next.from
      else if (field === 'to') delete next.to
      else if (prev[field]) delete next[field]
      return next
    })
    setForm((prev) => {
      if (!prev) return prev
      let next = { ...prev, [field]: value }
      if (field === 'from' || field === 'pickupCity') {
        next = { ...next, from: value, pickupCity: value }
      }
      const total = Number(next.freight) + Number(next.gst) + Number(next.hamali)
        + Number(next.loadingCharges) + Number(next.unloadingCharges) + Number(next.insurance)
        + Number(next.otherCharges || 0)
      next.balance = total - Number(next.advance)
      return next
    })
  }, [])

  const validate = useCallback(() => {
    const synced = syncLrRouteFields(form)
    if (synced.from !== form.from || synced.pickupCity !== form.pickupCity || synced.to !== form.to) {
      setForm(synced)
    }
    const errors = buildFieldErrors(synced)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      scrollToFirstFieldError(errors)
      setValidationOpen(true)
      return { ok: false, synced }
    }
    setValidationOpen(false)
    return { ok: true, synced }
  }, [form])

  const handleSave = useCallback(async (andPrint = false) => {
    const { ok, synced } = validate()
    if (!ok) return
    setSaving(true)
    try {
      await lrApi.update(lrNumber, buildLrApiPayload(synced))
      toast({ title: 'LR updated', message: `${lrNumber} saved successfully.`, type: 'success' })
      if (andPrint) {
        const lr = await lrApi.get(lrNumber)
        await printModuleDocument({
          moduleCode: PRINT_MODULE_CODES.LR_LIST,
          company,
          print,
          documentData: { lr },
        })
      }
      navigate('/lr/list')
    } catch (err) {
      setValidationOpen(false)
      toast({ title: 'Update failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [validate, lrNumber, company, navigate, print, toast])

  const handlePreview = useCallback(() => {
    if (!form) return
    printModuleDocument({
      moduleCode: PRINT_MODULE_CODES.LR_LIST,
      company,
      print,
      documentData: { lr: formToPreviewLr(form) },
    })
  }, [form, company, print])

  const handleClear = useCallback(() => {
    if (snapshot) {
      setForm({
        ...snapshot,
        items: (snapshot.items?.length ? snapshot.items : emptyLrEntryForm().items).map((item) => ({ ...item })),
      })
    }
    setFieldErrors({})
    setValidationOpen(false)
  }, [snapshot])

  const handleCancel = useCallback(() => navigate('/lr/list'), [navigate])

  useAutoFocus(formRef)
  useKeyboardPageActions({
    onSave: () => handleSave(false),
    onPrint: () => handleSave(true),
    onCancel: handleCancel,
    onNew: handleClear,
    onAddRow: () => formActionsRef.current?.addItem?.(),
    onSearch: () => {
      document.getElementById('lr-section-parties')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  }, [handleSave, handleCancel, handleClear])

  const financials = useMemo(() => (form ? computeLrFinancials(form) : null), [form])

  if (loading) {
    return (
      <div className="lr-entry-page flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
        <ERPPageTitle module="LR" title={`Edit LR ${lrNumber}`} />
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading LR…
        </p>
      </div>
    )
  }

  if (loadError || !form) {
    return (
      <div className="lr-entry-page flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
        <ERPPageTitle module="LR" title={`Edit LR ${lrNumber}`} />
        <p className="mb-3 text-sm text-red-600">{loadError || 'LR not found.'}</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/lr/list')}>
          Back to LR list
        </Button>
      </div>
    )
  }

  return (
    <div className="lr-entry-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="LR"
        title={`Edit LR ${lrNumber}`}
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'LR', path: '/lr/list' },
          { label: lrNumber },
          { label: 'Edit' },
        ]}
      />

      <div ref={formRef} data-kbd-form-root className="lr-entry-v2-page flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="lr-entry-v2-scroll min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          <Card className="mb-3 p-3">
            <LrStatusFlow currentStatus={lrStatus} layout="horizontal" />
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" icon={Workflow} onClick={() => navigate(lrProcessPath(lrNumber))}>
                Open full process flow
              </Button>
            </div>
          </Card>

          <LrEntryFormLayout
            form={form}
            setForm={setForm}
            update={update}
            fieldErrors={fieldErrors}
            formActionsRef={formActionsRef}
            onClearFieldErrors={clearFieldErrors}
          />
        </div>

        <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
          <LrEntryActionButtons
            saving={saving}
            onClear={handleClear}
            onCancel={handleCancel}
            onPreview={handlePreview}
            onSave={() => handleSave(false)}
            onSavePrint={() => handleSave(true)}
            financialSummary={financials ? (
              <LrEntryFinancialSummary
                subTotal={financials.subTotal}
                taxable={financials.taxable}
                gstAmount={financials.gstAmount}
                totalAmount={financials.totalAmount}
                balance={financials.balance}
              />
            ) : null}
          />
        </footer>
      </div>

      <FormValidationPopup
        open={validationOpen}
        errors={fieldErrors}
        onClose={() => {
          setValidationOpen(false)
          focusFirstFieldError(fieldErrors)
        }}
      />
    </div>
  )
}
