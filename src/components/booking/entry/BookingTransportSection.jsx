import { ArrowRight } from 'lucide-react'
import Input from '../../ui/Input'
import VehicleMasterSelect from '../../masters/VehicleMasterSelect'
import DriverMasterSelect from '../../masters/DriverMasterSelect'
import LrEntrySectionCard from '../../lr/entry/LrEntrySectionCard'
import { fieldLabel, fieldRequired, fieldVisible } from '../../../utils/fieldConfig'

export default function BookingTransportSection({
  form,
  update,
  errors = {},
  fieldMap = {},
  disabled = false,
}) {
  const label = (key, fallback) => fieldLabel(fieldMap, key, fallback)
  const req = (key) => fieldRequired(fieldMap, key)
  const vis = (key) => fieldVisible(fieldMap, key)

  return (
    <LrEntrySectionCard title="4. Transport Information" id="booking-section-transport">
      <div className="lr-entry-v2-route-layout">
        {vis('From') && (
          <div className="lr-entry-v2-route-col">
            <p className="lr-entry-v2-route-label">Origin</p>
            <Input
              id="booking-field-from"
              label={label('From', 'From')}
              value={form.from}
              onChange={(e) => update('from', e.target.value)}
              placeholder="Origin city"
              required={req('From')}
              error={errors.from}
              disabled={disabled}
            />
          </div>
        )}
        {vis('From') && vis('To') && (
          <div className="lr-entry-v2-route-arrow" aria-hidden>
            <ArrowRight className="h-6 w-6 text-primary" />
          </div>
        )}
        {vis('To') && (
          <div className="lr-entry-v2-route-col">
            <p className="lr-entry-v2-route-label">Destination</p>
            <Input
              id="booking-field-to"
              label={label('To', 'To')}
              value={form.to}
              onChange={(e) => update('to', e.target.value)}
              placeholder="Destination city"
              required={req('To')}
              error={errors.to}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div className="lr-entry-v2-grid lr-entry-v2-grid--route mt-3">
        {vis('Vehicle') && (
          <div id="booking-field-vehicle">
            <VehicleMasterSelect
              label={label('Vehicle', 'Vehicle')}
              displayValue={form.vehicle}
              placeholder="Search vehicle number…"
              disabled={disabled}
              onSelect={(row) => update('vehicle', row.number ?? '')}
            />
            {errors.vehicle ? <p className="mt-1 text-xs text-red-500">{errors.vehicle}</p> : null}
          </div>
        )}
        {vis('Driver') && (
          <div id="booking-field-driver">
            <DriverMasterSelect
              label={label('Driver', 'Driver')}
              displayValue={form.driver}
              placeholder="Search driver name…"
              disabled={disabled}
              onSelect={(row) => update('driver', row.name ?? '')}
            />
            {errors.driver ? <p className="mt-1 text-xs text-red-500">{errors.driver}</p> : null}
          </div>
        )}
      </div>
    </LrEntrySectionCard>
  )
}
