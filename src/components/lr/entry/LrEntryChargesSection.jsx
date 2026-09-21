import Input, { Select } from '../../ui/Input'
import LrEntrySectionCard from './LrEntrySectionCard'
import { fieldLabel, fieldRequired, fieldVisible } from '../../../utils/fieldConfig'

const PAYMENT_TYPES = ['To Pay', 'Paid', 'TBB', 'To Be Billed']
const GST_OPTIONS = ['0%', '5%', '12%', '18%', '28%']

function numDisplay(value) {
  if (value === '' || value == null) return ''
  if (Number(value) === 0) return ''
  return value
}

export default function LrEntryChargesSection({ form, update, fieldMap = {} }) {
  const label = (key, fallback) => fieldLabel(fieldMap, key, fallback)
  const req = (key) => fieldRequired(fieldMap, key)
  const vis = (key) => fieldVisible(fieldMap, key)

  return (
    <LrEntrySectionCard title="5. Charges & Freight" id="lr-section-charges" className="lr-entry-v2-section--paired lr-entry-v2-section--charges">
      <div className="lr-entry-v2-charges-left">
        {vis('PaymentType') ? (
          <Select
            label={`${label('PaymentType', 'Freight Type')}${req('PaymentType') ? ' *' : ''}`}
            options={PAYMENT_TYPES}
            value={form.paymentType}
            onChange={(e) => update('paymentType', e.target.value)}
          />
        ) : null}
        {vis('Freight') ? (
          <Input
            label={`${label('Freight', 'Freight (₹)')}${req('Freight') ? ' *' : ''}`}
            type="number"
            value={numDisplay(form.freight)}
            onChange={(e) => update('freight', e.target.value || 0)}
          />
        ) : null}
        {vis('LoadingCharges') ? (
          <Input
            label={`${label('LoadingCharges', 'Loading Charges (₹)')}${req('LoadingCharges') ? ' *' : ''}`}
            type="number"
            value={numDisplay(form.loadingCharges)}
            onChange={(e) => update('loadingCharges', e.target.value || 0)}
          />
        ) : null}
        {vis('UnloadingCharges') ? (
          <Input
            label={`${label('UnloadingCharges', 'Unloading Charges (₹)')}${req('UnloadingCharges') ? ' *' : ''}`}
            type="number"
            value={numDisplay(form.unloadingCharges)}
            onChange={(e) => update('unloadingCharges', e.target.value || 0)}
          />
        ) : null}
        {vis('OtherCharges') ? (
          <Input
            label={`${label('OtherCharges', 'Other Charges (₹)')}${req('OtherCharges') ? ' *' : ''}`}
            type="number"
            value={numDisplay(form.otherCharges)}
            onChange={(e) => update('otherCharges', e.target.value || 0)}
          />
        ) : null}
        {vis('Advance') ? (
          <Input
            label={`${label('Advance', 'Advance (₹)')}${req('Advance') ? ' *' : ''}`}
            type="number"
            value={numDisplay(form.advance)}
            onChange={(e) => update('advance', e.target.value || 0)}
          />
        ) : null}
        {vis('GstPercent') ? (
          <Select
            label={`${label('GstPercent', 'GST %')}${req('GstPercent') ? ' *' : ''}`}
            options={GST_OPTIONS}
            value={form.gstPercent}
            onChange={(e) => update('gstPercent', e.target.value)}
          />
        ) : null}
      </div>
    </LrEntrySectionCard>
  )
}
