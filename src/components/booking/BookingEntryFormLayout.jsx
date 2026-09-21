import BookingInformationSection from './entry/BookingInformationSection'
import BookingPartiesSection from './entry/BookingPartiesSection'
import BookingMaterialSection from './entry/BookingMaterialSection'
import BookingTransportSection from './entry/BookingTransportSection'
import BookingChargesSection from './entry/BookingChargesSection'
import BookingAdditionalSection from './entry/BookingAdditionalSection'

export const emptyBookingEntryForm = () => ({
  bookingNumber: '',
  date: new Date().toISOString().slice(0, 10),
  branchName: '',
  lrNumber: '',
  consignorId: '',
  consigneeId: '',
  consignor: '',
  consignee: '',
  consignorPhone: '',
  consignorGst: '',
  consignorAddress: '',
  consigneePhone: '',
  consigneeGst: '',
  consigneeAddress: '',
  from: '',
  to: '',
  materialId: '',
  material: '',
  quantity: '',
  vehicle: '',
  driver: '',
  freight: '',
  advance: '',
  payment: 'Unpaid',
  status: 'Pending',
  remarks: '',
})

export function buildBookingApiPayload(form) {
  return {
    date: form.date,
    customer: form.consignor || form.consignee || '',
    consignor: form.consignor || null,
    consignee: form.consignee || null,
    consignorId: form.consignorId || null,
    consigneeId: form.consigneeId || null,
    from: form.from || '',
    to: form.to || '',
    material: form.material || null,
    materialId: form.materialId || null,
    quantity: form.quantity || null,
    vehicle: form.vehicle || null,
    driver: form.driver || null,
    freight: Number(form.freight) || 0,
    advance: Number(form.advance) || 0,
    status: form.status || 'Pending',
    payment: form.payment || 'Unpaid',
    remarks: form.remarks || null,
    lrNumber: form.lrNumber || undefined,
  }
}

export default function BookingEntryFormLayout({
  form,
  setForm,
  update,
  lrSlot,
  fieldErrors = {},
  fieldMap = {},
  onClearFieldErrors,
  onApplyRate,
  detailsLocked = false,
  showStatus = false,
  statusOptions = [],
}) {
  return (
    <div className="lr-entry-v2-shell">
      <BookingInformationSection
        form={form}
        update={update}
        lrSlot={lrSlot}
        errors={fieldErrors}
        fieldMap={fieldMap}
        disabled={detailsLocked}
      />
      <BookingPartiesSection
        form={form}
        setForm={setForm}
        onClearFieldErrors={onClearFieldErrors}
        errors={fieldErrors}
        fieldMap={fieldMap}
        disabled={detailsLocked}
      />
      <BookingMaterialSection
        form={form}
        setForm={setForm}
        update={update}
        errors={fieldErrors}
        fieldMap={fieldMap}
        disabled={detailsLocked}
      />
      <BookingTransportSection
        form={form}
        update={update}
        errors={fieldErrors}
        fieldMap={fieldMap}
        disabled={detailsLocked}
      />
      <BookingChargesSection
        form={form}
        update={update}
        onApplyRate={onApplyRate}
        fieldMap={fieldMap}
        disabled={detailsLocked}
        showStatus={showStatus}
        statusOptions={statusOptions}
      />
      <BookingAdditionalSection
        form={form}
        update={update}
        fieldMap={fieldMap}
        disabled={false}
      />
    </div>
  )
}
