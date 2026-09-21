import Input, { Select } from '../../ui/Input'
import BranchSelect from '../../ui/BranchSelect'
import LrEntrySectionCard from './LrEntrySectionCard'
import { LR_BUSINESS_TYPES, LR_BUSINESS_TYPE_LABELS } from '../../../constants/lrBusinessTypes'
import { fieldLabel, fieldRequired, fieldVisible } from '../../../utils/fieldConfig'

const SERVICE_TYPES = ['Normal', 'Express', 'ODC', 'Priority']

export default function LrEntryInformationSection({
  form,
  update,
  bookingSlot,
  errors = {},
  fieldMap = {},
}) {
  const label = (key, fallback) => fieldLabel(fieldMap, key, fallback)
  const req = (key) => fieldRequired(fieldMap, key)
  const vis = (key) => fieldVisible(fieldMap, key)

  return (
    <LrEntrySectionCard title="1. LR Information" id="lr-section-info">
      <div className="lr-entry-v2-grid lr-entry-v2-grid--info">
        <Input
          label="LR No."
          value={form.lrNumber || 'AUTO'}
          readOnly
          className="lr-entry-v2-field"
        />
        {vis('LrDate') ? (
          <Input
            label={`${label('LrDate', 'LR Date')}${req('LrDate') ? ' *' : ''}`}
            id="lr-field-lr-date"
            type="date"
            value={form.lrDate}
            onChange={(e) => update('lrDate', e.target.value)}
            error={errors.lrDate}
            required={req('LrDate')}
          />
        ) : null}
        <BranchSelect
          id="lr-field-branch"
          label="Branch *"
          value={form.branchName}
          onChange={(v) => update('branchName', v)}
          placeholder="Select branch"
          error={errors.branchName}
        />
        {vis('BusinessType') ? (
          <Select
            label={`${label('BusinessType', 'Transport Type')}${req('BusinessType') ? ' *' : ''}`}
            options={LR_BUSINESS_TYPES.map((t) => ({ value: t, label: LR_BUSINESS_TYPE_LABELS[t] || t }))}
            value={form.businessType}
            onChange={(e) => update('businessType', e.target.value)}
          />
        ) : null}
        {vis('ServiceType') ? (
          <Select
            label={`${label('ServiceType', 'Service')}${req('ServiceType') ? ' *' : ''}`}
            options={SERVICE_TYPES}
            value={form.serviceType}
            onChange={(e) => update('serviceType', e.target.value)}
          />
        ) : null}
        {vis('BookingId') && bookingSlot ? (
          <div
            className={`lr-entry-v2-booking-field${errors.bookingId ? ' lr-entry-v2-booking-field--error' : ''}`}
            id="lr-booking-field"
          >
            {bookingSlot}
          </div>
        ) : null}
      </div>
    </LrEntrySectionCard>
  )
}
