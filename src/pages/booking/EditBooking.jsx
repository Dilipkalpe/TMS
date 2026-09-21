import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import BookingEntryFormLayout, {
  buildBookingApiPayload,
  emptyBookingEntryForm,
} from '../../components/booking/BookingEntryFormLayout'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import FormValidationPopup from '../../components/ui/FormValidationPopup'
import { bookingsApi, freightRatesApi, consignorsApi, consigneesApi } from '../../services/api'
import { fromDocPath, bookingPath } from '../../utils/docPath'
import { useToast } from '../../context/ToastContext'
import { useFieldConfig } from '../../hooks/useFieldConfig'
import { useKeyboardPageActions, useAutoFocus } from '../../hooks/useKeyboardPageActions'
import { scrollToFirstFieldError, focusFirstFieldError } from '../../utils/formValidationFocus'
import { buildBookingFieldErrors } from '../../utils/fieldConfig'

const BOOKING_STATUSES = ['Pending', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled']

async function hydrateBookingPartyContacts(form) {
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
    } catch { /* legacy booking without master row */ }
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
  return next
}

export default function EditBooking() {
  const { id: rawId } = useParams()
  const id = fromDocPath(rawId)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { map: fieldMap, loading: fieldsLoading } = useFieldConfig('Booking')
  const [form, setForm] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [validationOpen, setValidationOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [lrNumber, setLrNumber] = useState(null)
  const formRef = useRef(null)
  const detailsLocked = Boolean(lrNumber)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    bookingsApi.get(id)
      .then(async (booking) => {
        if (cancelled) return
        setLrNumber(booking.lrNumber || null)
        const mapped = {
          ...emptyBookingEntryForm(),
          bookingNumber: booking.id,
          date: booking.date,
          branchName: booking.branchName ?? '',
          consignorId: booking.consignorId ?? '',
          consigneeId: booking.consigneeId ?? '',
          consignor: booking.consignor ?? '',
          consignee: booking.consignee ?? '',
          from: booking.from ?? '',
          to: booking.to ?? '',
          materialId: booking.materialId ?? '',
          material: booking.material ?? '',
          quantity: booking.quantity ?? '',
          vehicle: booking.vehicle ?? '',
          driver: booking.driver ?? '',
          freight: booking.freight ?? 0,
          advance: booking.advance ?? 0,
          status: booking.status ?? 'Pending',
          payment: booking.payment ?? 'Unpaid',
          remarks: booking.remarks ?? '',
        }
        const hydrated = await hydrateBookingPartyContacts(mapped)
        if (!cancelled) setForm(hydrated)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Failed to load booking')
          toast({ title: 'Load failed', message: err.message, type: 'error' })
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, toast])

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

  const applyFreightRate = async () => {
    if (!form?.from?.trim() || !form?.to?.trim()) {
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

  const handleSave = useCallback(async () => {
    if (!form) return
    // When LR-linked, backend only updates status/payment/remarks — skip full field validation.
    const errors = detailsLocked ? {} : buildBookingFieldErrors(form, fieldMap)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      scrollToFirstFieldError(errors)
      setValidationOpen(true)
      return
    }
    setSaving(true)
    try {
      await bookingsApi.update(id, buildBookingApiPayload(form))
      toast({ title: 'Booking updated', type: 'success' })
      navigate(bookingPath(id))
    } catch (err) {
      toast({ title: 'Update failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [form, fieldMap, detailsLocked, id, navigate, toast])

  const handleCancel = useCallback(() => navigate(bookingPath(id)), [navigate, id])

  useAutoFocus(formRef)
  useKeyboardPageActions({
    onSave: handleSave,
    onCancel: handleCancel,
  }, [handleSave, handleCancel])

  if (loading) {
    return (
      <div className="lr-entry-page p-4">
        <ERPPageTitle module="Booking" title="Edit Booking" />
        <p className="text-sm text-slate-500">Loading booking…</p>
      </div>
    )
  }

  if (loadError || !form) {
    return (
      <div className="lr-entry-page p-4">
        <ERPPageTitle module="Booking" title="Edit Booking" />
        <p className="text-sm text-red-600">{loadError || 'Booking not found.'}</p>
        <div className="mt-4">
          <LrEntryActionButtons onCancel={handleCancel} saveLabel="Update Booking" />
        </div>
      </div>
    )
  }

  return (
    <div className="lr-entry-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Booking"
        title={`Edit Booking ${id}`}
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Bookings', path: '/bookings' },
          { label: id, path: bookingPath(id) },
          { label: 'Edit' },
        ]}
      />

      <div ref={formRef} data-kbd-form-root className="lr-entry-v2-page flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="lr-entry-v2-scroll min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          {!detailsLocked && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
              No LR yet — you can edit all booking details before generating the LR.
            </div>
          )}
          {detailsLocked && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              LR <strong>{lrNumber}</strong> is already generated. Booking details are locked; you can still update status, payment, and remarks.
            </div>
          )}

          {fieldsLoading ? (
            <p className="p-4 text-sm text-slate-500">Loading field configuration…</p>
          ) : (
            <BookingEntryFormLayout
              form={form}
              setForm={setForm}
              update={update}
              fieldErrors={fieldErrors}
              fieldMap={fieldMap}
              onClearFieldErrors={clearFieldErrors}
              onApplyRate={detailsLocked ? undefined : applyFreightRate}
              detailsLocked={detailsLocked}
              showStatus
              statusOptions={BOOKING_STATUSES}
            />
          )}
        </div>

        <footer className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
          <LrEntryActionButtons
            saving={saving}
            saveDisabled={fieldsLoading}
            onCancel={handleCancel}
            onSave={handleSave}
            saveLabel="Update Booking"
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
