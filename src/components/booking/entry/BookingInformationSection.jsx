import Input from '../../ui/Input'
import BranchSelect from '../../ui/BranchSelect'
import LrEntrySectionCard from '../../lr/entry/LrEntrySectionCard'
import { fieldLabel, fieldRequired, fieldVisible } from '../../../utils/fieldConfig'

export default function BookingInformationSection({
  form,
  update,
  lrSlot,
  errors = {},
  fieldMap = {},
  disabled = false,
}) {
  const label = (key, fallback) => fieldLabel(fieldMap, key, fallback)
  const req = (key) => fieldRequired(fieldMap, key)
  const vis = (key) => fieldVisible(fieldMap, key)

  return (
    <LrEntrySectionCard title="1. Booking Information" id="booking-section-info">
      <div className="lr-entry-v2-grid lr-entry-v2-grid--info">
        <Input
          label="Booking No."
          value={form.bookingNumber || 'AUTO'}
          readOnly
          className="lr-entry-v2-field"
        />
        {vis('Date') && (
          <Input
            label={label('Date', 'Booking Date')}
            id="booking-field-date"
            type="date"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            error={errors.date}
            required={req('Date')}
            disabled={disabled}
          />
        )}
        <BranchSelect
          id="booking-field-branch"
          label="Branch"
          value={form.branchName}
          onChange={(v) => update('branchName', v)}
          placeholder="Select branch"
          disabled
        />
        <p className="col-span-full -mt-2 text-xs text-slate-500">
          Branch is assigned from your login context when saving (same as before).
        </p>
        {lrSlot ? (
          <div className="lr-entry-v2-booking-field" id="booking-lr-field">
            {lrSlot}
          </div>
        ) : null}
      </div>
    </LrEntrySectionCard>
  )
}
