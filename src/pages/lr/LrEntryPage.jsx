import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Input, { Select } from '../../components/ui/Input'
import LrEntryFormLayout, { buildLrApiPayload, emptyLrEntryForm, formToPreviewLr } from '../../components/lr/LrEntryFormLayout'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import LrEntryFinancialSummary from '../../components/lr/entry/LrEntryFinancialSummary'
import { computeLrFinancials } from '../../utils/lrEntryFinancials'
import LrEntryDocumentFlow from '../../components/lr/entry/LrEntryDocumentFlow'
import { lrApi, bookingsApi, unwrapList } from '../../services/api'
import { useDocumentFlow } from '../../hooks/useDocumentFlow'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import { useAuth } from '../../context/AuthContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import FormValidationPopup from '../../components/ui/FormValidationPopup'
import { scrollToFirstFieldError, focusFirstFieldError } from '../../utils/formValidationFocus'
import { syncLrRouteFields } from '../../utils/partyMasterLr'
import { useKeyboardPageActions, useAutoFocus } from '../../hooks/useKeyboardPageActions'
import { clearControlsAfterSave } from '../../utils/formResetAfterSave'

function buildFieldErrors(form) {
  const errors = {}
  if (!form.lrDate?.trim()) errors.lrDate = 'LR Date is required.'
  if (!form.consignorId && !form.consignor?.trim()) errors.consignor = 'Please select Consignor.'
  if (!form.consigneeId && !form.consignee?.trim()) errors.consignee = 'Please select Consignee.'
  if (!form.from?.trim() && !form.pickupCity?.trim()) errors.from = 'Pickup city is required.'
  if (!form.to?.trim()) errors.to = 'Delivery city is required.'
  return errors
}

export default function LrEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const { isFirstBookingThenLr, loading: flowLoading } = useDocumentFlow()
  const [form, setForm] = useState(emptyLrEntryForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [validationOpen, setValidationOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bookingOptions, setBookingOptions] = useState([{ value: '', label: 'Select booking…' }])
  const formActionsRef = useRef(null)

  useEffect(() => {
    if (user?.branchName && !form.branchName) {
      setForm((prev) => ({
        ...prev,
        branchName: user.branchName,
        deliveryBranch: prev.deliveryBranch || user.branchName,
      }))
    }
  }, [user?.branchName]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isFirstBookingThenLr) return
    bookingsApi.list({ page: 1, pageSize: 100 })
      .then((res) => {
        const rows = unwrapList(res)
        setBookingOptions([
          { value: '', label: 'Select booking…' },
          ...rows.map((b) => ({
            value: b.id,
            label: `${b.id} · ${b.customer || b.customerName || ''} · ${b.from || ''} → ${b.to || ''}`,
          })),
        ])
      })
      .catch(() => {})
  }, [isFirstBookingThenLr])

  const loadBooking = useCallback((bookingId) => {
    if (!bookingId) return
    lrApi.prefillFromBooking(bookingId)
      .then((prefill) => setForm((prev) => ({ ...prev, ...prefill, bookingId: prefill.bookingId })))
      .catch((err) => toast({ title: 'Booking load failed', message: err.message, type: 'warning' }))
  }, [toast])

  useEffect(() => {
    const bookingId = searchParams.get('bookingId')
    if (bookingId) loadBooking(bookingId)
  }, [searchParams, loadBooking])

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

  const update = (field, value) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      if (field === 'from' || field === 'pickupCity') delete next.from
      else if (field === 'to') delete next.to
      else if (prev[field]) delete next[field]
      return next
    })
    setForm((prev) => {
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
  }

  const validate = () => {
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
  }

  const handleSave = useCallback(async (andPrint = false) => {
    const { ok, synced } = validate()
    if (!ok) return
    setSaving(true)
    try {
      const created = await lrApi.create(buildLrApiPayload(synced))
      toast({ title: 'LR saved', message: `${created.lrNumber} created.`, type: 'success' })
      if (andPrint) {
        const lr = await lrApi.get(created.lrNumber)
        await printModuleDocument({
          moduleCode: PRINT_MODULE_CODES.LR_LIST,
          company,
          print,
          documentData: { lr },
        })
      }
      clearControlsAfterSave({
        reset: () => {
          setForm({ ...emptyLrEntryForm(), branchName: user?.branchName || '' })
          setFieldErrors({})
          setValidationOpen(false)
        },
        formRoot: formRef.current,
      })
    } catch (err) {
      setValidationOpen(false)
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [form, company, print, toast, user?.branchName])

  const handlePreview = useCallback(() => {
    printModuleDocument({
      moduleCode: PRINT_MODULE_CODES.LR_LIST,
      company,
      print,
      documentData: { lr: formToPreviewLr(form) },
    })
  }, [form, company, print])

  const handleClear = useCallback(() => {
    setForm({ ...emptyLrEntryForm(), branchName: user?.branchName || '' })
    setFieldErrors({})
    setValidationOpen(false)
  }, [user?.branchName])

  const handleCancel = useCallback(() => navigate('/lr/list'), [navigate])

  const focusBookingField = useCallback(() => {
    document.getElementById('lr-booking-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const el = document.querySelector('#lr-booking-field select, #lr-booking-field input')
    el?.focus()
  }, [])

  const bookingLabel = useMemo(() => {
    if (!form.bookingId) return ''
    const opt = bookingOptions.find((o) => o.value === form.bookingId)
    return opt?.label?.split(' · ')[0] || form.bookingId
  }, [form.bookingId, bookingOptions])

  const financials = useMemo(() => computeLrFinancials(form), [form])

  const formRef = useRef(null)
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

  const bookingSlot = isFirstBookingThenLr ? (
    <Select
      label="Booking No. (Optional)"
      value={form.bookingId}
      options={bookingOptions}
      error={fieldErrors.bookingId}
      onChange={(e) => {
        const bookingId = e.target.value
        update('bookingId', bookingId)
        if (bookingId) loadBooking(bookingId)
      }}
    />
  ) : (
    <Input
      label="Booking No. (Optional)"
      value={form.bookingId}
      error={fieldErrors.bookingId}
      onChange={(e) => update('bookingId', e.target.value)}
    />
  )

  return (
    <div className="lr-entry-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="LR"
        title="New LR Entry"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'LR', path: '/lr/list' },
          { label: 'LR Entry' },
        ]}
      />

      <div ref={formRef} data-kbd-form-root className="lr-entry-v2-page flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="lr-entry-v2-scroll min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          {!flowLoading && (
            <LrEntryDocumentFlow
              bookingId={form.bookingId}
              bookingLabel={bookingLabel}
              isBookingRequired={false}
              onSelectBooking={focusBookingField}
              onChangeBooking={focusBookingField}
            />
          )}

          <LrEntryFormLayout
            form={form}
            setForm={setForm}
            update={update}
            bookingSlot={bookingSlot}
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
            financialSummary={(
              <LrEntryFinancialSummary
                subTotal={financials.subTotal}
                taxable={financials.taxable}
                gstAmount={financials.gstAmount}
                totalAmount={financials.totalAmount}
                balance={financials.balance}
              />
            )}
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
