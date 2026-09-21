import { Textarea } from '../../ui/Input'
import LrEntrySectionCard from '../../lr/entry/LrEntrySectionCard'
import { fieldLabel, fieldRequired, fieldVisible } from '../../../utils/fieldConfig'

export default function BookingAdditionalSection({
  form,
  update,
  fieldMap = {},
  disabled = false,
}) {
  if (!fieldVisible(fieldMap, 'Remarks')) return null
  return (
    <LrEntrySectionCard title="6. Additional Information" id="booking-section-additional">
      <Textarea
        label={fieldLabel(fieldMap, 'Remarks', 'Remarks')}
        value={form.remarks}
        onChange={(e) => update('remarks', e.target.value)}
        placeholder="Additional notes…"
        required={fieldRequired(fieldMap, 'Remarks')}
        rows={3}
        maxLength={500}
        disabled={disabled}
      />
    </LrEntrySectionCard>
  )
}
