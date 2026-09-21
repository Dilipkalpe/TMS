import { ArrowRight } from 'lucide-react'
import Input from '../../ui/Input'
import BranchSelect from '../../ui/BranchSelect'
import VehicleMasterSelect from '../../masters/VehicleMasterSelect'
import DriverMasterSelect from '../../masters/DriverMasterSelect'
import LrEntrySectionCard from './LrEntrySectionCard'
import { fieldLabel, fieldRequired, fieldVisible } from '../../../utils/fieldConfig'

function RouteFieldLabel({ children }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
    </label>
  )
}

export default function LrEntryRouteSection({ form, setForm, update, errors = {}, fieldMap = {} }) {
  const label = (key, fallback) => fieldLabel(fieldMap, key, fallback)
  const req = (key) => fieldRequired(fieldMap, key)
  const vis = (key) => fieldVisible(fieldMap, key)

  const showPickup = vis('PickupAddress') || vis('From')
  const showDelivery = vis('To')

  return (
    <LrEntrySectionCard title="3. Route & Delivery" id="lr-section-route">
      {(showPickup || showDelivery) ? (
        <div className="lr-entry-v2-route-layout">
          {showPickup ? (
            <div className="lr-entry-v2-route-col">
              <p className="lr-entry-v2-route-label">Pickup</p>
              {vis('PickupAddress') ? (
                <Input
                  label={`${label('PickupAddress', 'Pickup Address')}${req('PickupAddress') ? ' *' : ''}`}
                  value={form.pickupAddress}
                  onChange={(e) => update('pickupAddress', e.target.value)}
                  placeholder="Pickup address"
                />
              ) : null}
              {vis('From') ? (
                <Input
                  id="lr-field-from"
                  label={`${label('From', 'Pickup City')}${req('From') ? ' *' : ''}`}
                  value={form.pickupCity || form.from}
                  onChange={(e) => update('from', e.target.value)}
                  placeholder="Origin city"
                  error={errors.from}
                />
              ) : null}
            </div>
          ) : null}

          {(showPickup && showDelivery) ? (
            <div className="lr-entry-v2-route-arrow" aria-hidden>
              <ArrowRight className="h-6 w-6 text-primary" />
            </div>
          ) : null}

          {showDelivery ? (
            <div className="lr-entry-v2-route-col">
              <p className="lr-entry-v2-route-label">Delivery</p>
              <Input
                label="Delivery Address"
                value={form.consigneeAddress}
                onChange={(e) => update('consigneeAddress', e.target.value)}
                placeholder="Delivery address"
              />
              {vis('To') ? (
                <Input
                  id="lr-field-to"
                  label={`${label('To', 'Delivery City')}${req('To') ? ' *' : ''}`}
                  value={form.to}
                  onChange={(e) => update('to', e.target.value)}
                  placeholder="Destination city"
                  error={errors.to}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="lr-entry-v2-grid lr-entry-v2-grid--route mt-3">
        {vis('DeliveryBranch') ? (
          <BranchSelect
            label={`${label('DeliveryBranch', 'Delivery Branch')}${req('DeliveryBranch') ? ' *' : ''}`}
            value={form.deliveryBranch}
            onChange={(v) => update('deliveryBranch', v)}
            placeholder="Select delivery branch"
          />
        ) : null}
        {vis('ExpectedDeliveryDate') ? (
          <Input
            label={`${label('ExpectedDeliveryDate', 'Expected Delivery Date')}${req('ExpectedDeliveryDate') ? ' *' : ''}`}
            type="date"
            value={form.expectedDeliveryDate}
            onChange={(e) => update('expectedDeliveryDate', e.target.value)}
          />
        ) : null}
        {vis('ExpectedDeliveryTime') ? (
          <Input
            label={`${label('ExpectedDeliveryTime', 'Expected Delivery Time')}${req('ExpectedDeliveryTime') ? ' *' : ''}`}
            type="time"
            value={form.expectedDeliveryTime || ''}
            onChange={(e) => update('expectedDeliveryTime', e.target.value)}
          />
        ) : null}
        {vis('Vehicle') ? (
          <div>
            <RouteFieldLabel>
              {`${label('Vehicle', 'Vehicle No.')}${req('Vehicle') ? ' *' : ''}`}
            </RouteFieldLabel>
            <VehicleMasterSelect
              label={false}
              displayValue={form.vehicle}
              placeholder="Search vehicle number…"
              onSelect={(row) => update('vehicle', row.number ?? '')}
            />
          </div>
        ) : null}
        {vis('Driver') ? (
          <div>
            <RouteFieldLabel>
              {`${label('Driver', 'Driver Name')}${req('Driver') ? ' *' : ''}`}
            </RouteFieldLabel>
            <DriverMasterSelect
              label={false}
              displayValue={form.driver}
              placeholder="Search driver name…"
              onSelect={(row) => update('driver', row.name ?? '')}
            />
          </div>
        ) : null}
        {vis('EwayBillNo') ? (
          <Input
            label={`${label('EwayBillNo', 'E-Way Bill No.')}${req('EwayBillNo') ? ' *' : ''}`}
            value={form.ewayBillNo}
            onChange={(e) => update('ewayBillNo', e.target.value)}
          />
        ) : null}
      </div>
    </LrEntrySectionCard>
  )
}
