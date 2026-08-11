import { ArrowRight } from 'lucide-react'
import Input from '../../ui/Input'
import BranchSelect from '../../ui/BranchSelect'
import VehicleMasterSelect from '../../masters/VehicleMasterSelect'
import DriverMasterSelect from '../../masters/DriverMasterSelect'
import LrEntrySectionCard from './LrEntrySectionCard'

function RouteFieldLabel({ children }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
    </label>
  )
}

export default function LrEntryRouteSection({ form, setForm, update, errors = {} }) {
  return (
    <LrEntrySectionCard title="3. Route & Delivery" id="lr-section-route">
      <div className="lr-entry-v2-route-layout">
        <div className="lr-entry-v2-route-col">
          <p className="lr-entry-v2-route-label">Pickup</p>
          <Input
            label="Pickup Address"
            value={form.pickupAddress}
            onChange={(e) => update('pickupAddress', e.target.value)}
            placeholder="Pickup address"
          />
          <Input
            id="lr-field-from"
            label="Pickup City *"
            value={form.pickupCity || form.from}
            onChange={(e) => update('from', e.target.value)}
            placeholder="Origin city"
            error={errors.from}
          />
        </div>

        <div className="lr-entry-v2-route-arrow" aria-hidden>
          <ArrowRight className="h-6 w-6 text-primary" />
        </div>

        <div className="lr-entry-v2-route-col">
          <p className="lr-entry-v2-route-label">Delivery</p>
          <Input
            label="Delivery Address"
            value={form.consigneeAddress}
            onChange={(e) => update('consigneeAddress', e.target.value)}
            placeholder="Delivery address"
          />
          <Input
            id="lr-field-to"
            label="Delivery City *"
            value={form.to}
            onChange={(e) => update('to', e.target.value)}
            placeholder="Destination city"
            error={errors.to}
          />
        </div>
      </div>

      <div className="lr-entry-v2-grid lr-entry-v2-grid--route mt-3">
        <BranchSelect
          label="Delivery Branch *"
          value={form.deliveryBranch}
          onChange={(v) => update('deliveryBranch', v)}
          placeholder="Select delivery branch"
        />
        <Input
          label="Expected Delivery Date"
          type="date"
          value={form.expectedDeliveryDate}
          onChange={(e) => update('expectedDeliveryDate', e.target.value)}
        />
        <Input
          label="Expected Delivery Time"
          type="time"
          value={form.expectedDeliveryTime || ''}
          onChange={(e) => update('expectedDeliveryTime', e.target.value)}
        />
        <div>
          <RouteFieldLabel>Vehicle No. (Optional)</RouteFieldLabel>
          <VehicleMasterSelect
            label={false}
            displayValue={form.vehicle}
            placeholder="Search vehicle number…"
            onSelect={(row) => update('vehicle', row.number ?? '')}
          />
        </div>
        <div>
          <RouteFieldLabel>Driver Name (Optional)</RouteFieldLabel>
          <DriverMasterSelect
            label={false}
            displayValue={form.driver}
            placeholder="Search driver name…"
            onSelect={(row) => update('driver', row.name ?? '')}
          />
        </div>
        <Input
          label="E-Way Bill No."
          value={form.ewayBillNo}
          onChange={(e) => update('ewayBillNo', e.target.value)}
        />
      </div>
    </LrEntrySectionCard>
  )
}
