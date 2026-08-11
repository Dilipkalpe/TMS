import Input, { Select } from '../../ui/Input'
import LrEntrySectionCard from './LrEntrySectionCard'

const PAYMENT_TYPES = ['To Pay', 'Paid', 'TBB', 'To Be Billed']
const GST_OPTIONS = ['0%', '5%', '12%', '18%', '28%']

function numDisplay(value) {
  if (value === '' || value == null) return ''
  if (Number(value) === 0) return ''
  return value
}

export default function LrEntryChargesSection({ form, update }) {
  return (
    <LrEntrySectionCard title="5. Charges & Freight" id="lr-section-charges" className="lr-entry-v2-section--paired lr-entry-v2-section--charges">
      <div className="lr-entry-v2-charges-left">
        <Select
          label="Freight Type"
          options={PAYMENT_TYPES}
          value={form.paymentType}
          onChange={(e) => update('paymentType', e.target.value)}
        />
        <Input
          label="Freight (₹)"
          type="number"
          value={numDisplay(form.freight)}
          onChange={(e) => update('freight', e.target.value || 0)}
        />
        <Input
          label="Loading Charges (₹)"
          type="number"
          value={numDisplay(form.loadingCharges)}
          onChange={(e) => update('loadingCharges', e.target.value || 0)}
        />
        <Input
          label="Unloading Charges (₹)"
          type="number"
          value={numDisplay(form.unloadingCharges)}
          onChange={(e) => update('unloadingCharges', e.target.value || 0)}
        />
        <Input
          label="Other Charges (₹)"
          type="number"
          value={numDisplay(form.otherCharges)}
          onChange={(e) => update('otherCharges', e.target.value || 0)}
        />
        <Input
          label="Advance (₹)"
          type="number"
          value={numDisplay(form.advance)}
          onChange={(e) => update('advance', e.target.value || 0)}
        />
        <Select
          label="GST %"
          options={GST_OPTIONS}
          value={form.gstPercent}
          onChange={(e) => update('gstPercent', e.target.value)}
        />
      </div>
    </LrEntrySectionCard>
  )
}
