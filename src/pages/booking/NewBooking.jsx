import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import { Select } from '../../components/ui/Input'
import BookingEntryFormLayout, {
  buildBookingApiPayload,
  emptyBookingEntryForm,
} from '../../components/booking/BookingEntryFormLayout'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import FormValidationPopup from '../../components/ui/FormValidationPopup'
import { bookingsApi, freightRatesApi, lrApi, unwrapList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useDocumentFlow } from '../../hooks/useDocumentFlow'
import { useFieldConfig } from '../../hooks/useFieldConfig'
import { useAuth } from '../../context/AuthContext'
import { useKeyboardPageActions, useAutoFocus } from '../../hooks/useKeyboardPageActions'
import { clearControlsAfterSave } from '../../utils/formResetAfterSave'
import { scrollToFirstFieldError, focusFirstFieldError } from '../../utils/formValidationFocus'
import { buildBookingFieldErrors } from '../../utils/fieldConfig'

export default function NewBooking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()
  const { isFirstLrThenBooking, documentFlowLabel, loading: flowLoading } = useDocumentFlow()
  const { map: fieldMap, loading: fieldsLoading } = useFieldConfig('Booking')
  const [form, setForm] = useState(() => ({
    ...emptyBookingEntryForm(),
    lrNumber: searchParams.get('lrNumber') || '',
  }))
  const [fieldErrors, setFieldErrors] = useState({})
  const [validationOpen, setValidationOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [unlinkedLrs, setUnlinkedLrs] = useState([])
  const formRef = useRef(null)

  useEffect(() => {
    if (user?.branchName && !form.branchName) {
      setForm((prev) => ({ ...prev, branchName: user.branchName }))
    }
  }, [user?.branchName]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isFirstLrThenBooking) return
    lrApi.list({ page: 1, pageSize: 100 })
      .then((res) => {
        const rows = unwrapList(res).filter((r) => !r.bookingId)
        setUnlinkedLrs(rows)
      })
      .catch(() => setUnlinkedLrs([]))
  }, [isFirstLrThenBooking])

  const lrOptions = useMemo(
    () => [
      { value: '', label: 'Select LR…' },
      ...unlinkedLrs.map((r) => ({
        value: r.lrNumber,
        label: `${r.lrNumber} · ${r.from || ''} → ${r.to || ''}`,
      })),
    ],
    [unlinkedLrs],
  )

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
      if (prev[field]) delete next[field]
      return next
    })
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const applyLr = async (lrNumber) => {
    update('lrNumber', lrNumber)
    if (!lrNumber) return
    try {
      const lr = await lrApi.get(lrNumber)
      setForm((f) => ({
        ...f,
        lrNumber,
        consignorId: lr.consignorId || f.consignorId,
        consigneeId: lr.consigneeId || f.consigneeId,
        consignor: lr.consignor || f.consignor,
        consignee: lr.consignee || f.consignee,
        from: lr.from || f.from,
        to: lr.to || f.to,
        vehicle: lr.vehicle || f.vehicle,
        driver: lr.driver || f.driver,
        materialId: lr.materialId || f.materialId,
        material: lr.material || f.material,
        quantity: lr.quantity || f.quantity,
        freight: lr.freight ?? f.freight,
        advance: lr.advance ?? f.advance,
      }))
      clearFieldErrors(['consignor', 'consignee', 'from', 'to', 'material'])
    } catch {
      /* keep manual entry */
    }
  }

  const applyFreightRate = async () => {
    if (!form.from?.trim() || !form.to?.trim()) {
      toast({ title: 'Validation', message: 'Enter From and To cities first.', type: 'warning' })
      return
    }
    try {
      const res = await freightRatesApi.lookup({
        from: form.from,
        to: form.to,
        customerId: '',
        vehicleType: '',
      })
      if (!res?.found) {
        toast({ title: 'No rate found', message: 'No matching freight rate for this lane.', type: 'warning' })
        return
      }
      update('freight', String(res.rate.rateAmount))
      toast({ title: 'Freight rate applied', message: `₹${res.rate.rateAmount} (${res.rate.rateUnit})`, type: 'success' })
    } catch (err) {
      toast({ title: 'Lookup failed', message: err.message, type: 'error' })
    }
  }

  const validate = () => {
    if (isFirstLrThenBooking && !form.lrNumber?.trim()) {
      const errors = {
        lrNumber: `Company Document Flow is "${documentFlowLabel}". Create an LR first, then select it here.`,
      }
      setFieldErrors(errors)
      setValidationOpen(true)
      return { ok: false }
    }
    const errors = buildBookingFieldErrors(form, fieldMap)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      scrollToFirstFieldError(errors)
      setValidationOpen(true)
      return { ok: false }
    }
    setValidationOpen(false)
    return { ok: true }
  }

  const handleSave = useCallback(async () => {
    const { ok } = validate()
    if (!ok) return
    setSaving(true)
    try {
      await bookingsApi.create(buildBookingApiPayload(form))
      toast({ title: 'Booking saved', type: 'success' })
      clearControlsAfterSave({
        reset: () => {
          setForm({
            ...emptyBookingEntryForm(),
            branchName: user?.branchName || '',
          })
          setFieldErrors({})
          setValidationOpen(false)
        },
        formRoot: formRef.current,
      })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [form, fieldMap, isFirstLrThenBooking, documentFlowLabel, toast, user?.branchName])

  const handleClear = useCallback(() => {
    setForm({
      ...emptyBookingEntryForm(),
      branchName: user?.branchName || '',
    })
    setFieldErrors({})
    setValidationOpen(false)
  }, [user?.branchName])

  const handleCancel = useCallback(() => navigate('/bookings'), [navigate])

  useAutoFocus(formRef)
  useKeyboardPageActions({
    onSave: handleSave,
    onCancel: handleCancel,
    onNew: handleClear,
  }, [handleSave, handleCancel, handleClear])

  const lrSlot = isFirstLrThenBooking ? (
    <Select
      label="Linked LR (required)"
      value={form.lrNumber}
      options={lrOptions}
      error={fieldErrors.lrNumber}
      onChange={(e) => applyLr(e.target.value)}
    />
  ) : null

  return (
    <div className="lr-entry-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Booking"
        title="Add New Record"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Bookings', path: '/bookings' },
          { label: 'New Booking' },
        ]}
      />

      <div ref={formRef} data-kbd-form-root className="lr-entry-v2-page flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="lr-entry-v2-scroll min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          {isFirstLrThenBooking && !flowLoading && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Document Flow: <strong>{documentFlowLabel}</strong>. Select an existing LR before saving this booking.
            </div>
          )}

          {fieldsLoading ? (
            <p className="p-4 text-sm text-slate-500">Loading field configuration…</p>
          ) : (
            <BookingEntryFormLayout
              form={form}
              setForm={setForm}
              update={update}
              lrSlot={lrSlot}
              fieldErrors={fieldErrors}
              fieldMap={fieldMap}
              onClearFieldErrors={clearFieldErrors}
              onApplyRate={applyFreightRate}
            />
          )}
        </div>

        <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
          <LrEntryActionButtons
            saving={saving}
            saveDisabled={fieldsLoading}
            onClear={handleClear}
            onCancel={handleCancel}
            onSave={handleSave}
            saveLabel="Save Booking"
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
