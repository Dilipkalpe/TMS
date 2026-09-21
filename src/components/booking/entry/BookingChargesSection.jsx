import Button from '../../ui/Button'
import Input, { Select } from '../../ui/Input'
import LrEntrySectionCard from '../../lr/entry/LrEntrySectionCard'
import { fieldLabel, fieldRequired, fieldVisible } from '../../../utils/fieldConfig'

const PAYMENT_STATUSES = ['Unpaid', 'Partial', 'Paid']

export default function BookingChargesSection({
  form,
  update,
  onApplyRate,
  fieldMap = {},
  disabled = false,
  showStatus = false,
  statusOptions = [],
}) {
  const label = (key, fallback) => fieldLabel(fieldMap, key, fallback)
  const req = (key) => fieldRequired(fieldMap, key)
  const vis = (key) => fieldVisible(fieldMap, key)
  const showAny = vis('Freight') || vis('Advance') || vis('Payment') || showStatus
  if (!showAny) return null

  return (
    <LrEntrySectionCard title="5. Charges & Payment" id="booking-section-charges">
      <div className="lr-entry-v2-grid lr-entry-v2-grid--info">
        {vis('Freight') && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={label('Freight', 'Freight (₹)')}
                type="number"
                value={form.freight}
                onChange={(e) => update('freight', e.target.value)}
                required={req('Freight')}
                disabled={disabled}
              />
            </div>
            {onApplyRate && !disabled ? (
              <Button type="button" variant="outline" className="mb-0.5 shrink-0" onClick={onApplyRate}>
                Apply Rate
              </Button>
            ) : null}
          </div>
        )}
        {vis('Advance') && (
          <Input
            label={label('Advance', 'Advance (₹)')}
            type="number"
            value={form.advance}
            onChange={(e) => update('advance', e.target.value)}
            required={req('Advance')}
            disabled={disabled}
          />
        )}
        {vis('Payment') && (
          <Select
            label={label('Payment', 'Payment Status')}
            value={form.payment}
            onChange={(e) => update('payment', e.target.value)}
            options={PAYMENT_STATUSES}
            required={req('Payment')}
          />
        )}
        {showStatus && (
          <Select
            label="Booking Status"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
            options={statusOptions}
          />
        )}
      </div>
    </LrEntrySectionCard>
  )
}
