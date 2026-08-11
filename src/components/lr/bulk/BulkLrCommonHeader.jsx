import Input, { Select } from '../../ui/Input'
import PartyMasterSelect from '../../masters/PartyMasterSelect'
import VehicleMasterSelect from '../../masters/VehicleMasterSelect'
import DriverMasterSelect from '../../masters/DriverMasterSelect'
import { consignorsApi, consigneesApi } from '../../../services/api'
import { applyConsignorToLrForm, applyConsigneeToLrForm } from '../../../utils/partyMasterLr'
import { FREIGHT_TYPES } from './bulkLrModel'
import { LR_BUSINESS_TYPES } from '../../../constants/lrBusinessTypes'

function Field({ children, className = '' }) {
  return <div className={`bulk-lr-field ${className}`}>{children}</div>
}

export default function BulkLrCommonHeader({ common, errors = {}, onChange, onPatch }) {
  return (
    <section className="bulk-lr-common" id="bulk-lr-common" data-bulk-party-search>
      <div className="bulk-lr-section-head">
        <div>
          <h2>Common Details</h2>
          <p>Applied to every LR row below</p>
        </div>
      </div>

      <div className="bulk-lr-common-layout">
        <div className="bulk-lr-common-main">
          <div className="bulk-lr-common-row">
            <Field className="bulk-lr-span-2">
              <PartyMasterSelect
                label="Consignor *"
                variant="dense"
                api={consignorsApi}
                valueId={common.consignorId}
                displayValue={common.consignor}
                onSelect={(row) => {
                  const mapped = applyConsignorToLrForm(row)
                  onPatch({
                    consignorId: mapped.consignorId,
                    consignor: mapped.consignor,
                    consignorPhone: mapped.consignorPhone,
                    consignorGst: mapped.consignorGst,
                    ...(mapped.from ? { from: mapped.from } : {}),
                  })
                }}
              />
              {errors.consignor ? <p className="bulk-lr-field-error">{errors.consignor}</p> : null}
            </Field>
            <Field className="bulk-lr-span-2">
              <PartyMasterSelect
                label="Consignee *"
                variant="dense"
                api={consigneesApi}
                valueId={common.consigneeId}
                displayValue={common.consignee}
                onSelect={(row) => {
                  const mapped = applyConsigneeToLrForm(row)
                  onPatch({
                    consigneeId: mapped.consigneeId,
                    consignee: mapped.consignee,
                    consigneePhone: mapped.consigneePhone,
                    consigneeGst: mapped.consigneeGst,
                    ...(mapped.to ? { to: mapped.to } : {}),
                  })
                }}
              />
              {errors.consignee ? <p className="bulk-lr-field-error">{errors.consignee}</p> : null}
            </Field>
            <Field>
              <Input
                label="Mobile"
                value={common.consignorPhone || ''}
                onChange={(e) => onChange('consignorPhone', e.target.value)}
                placeholder="Mobile"
              />
            </Field>
            <Field>
              <Input
                label="GSTIN"
                value={common.consignorGst || ''}
                onChange={(e) => onChange('consignorGst', e.target.value)}
                placeholder="GSTIN"
              />
            </Field>
            <Field>
              <Input
                label="From (Pickup) *"
                value={common.from}
                error={errors.from}
                onChange={(e) => onChange('from', e.target.value)}
                placeholder="Pickup city"
              />
            </Field>
            <Field>
              <Input
                label="To (Destination) *"
                value={common.to}
                error={errors.to}
                onChange={(e) => onChange('to', e.target.value)}
                placeholder="Delivery city"
              />
            </Field>
          </div>

          <div className="bulk-lr-common-row bulk-lr-common-row-secondary">
            <Field>
              <Select
                label="Freight Type"
                options={FREIGHT_TYPES}
                value={common.paymentType}
                onChange={(e) => onChange('paymentType', e.target.value)}
              />
            </Field>
            <Field>
              <VehicleMasterSelect
                label="Vehicle No."
                variant="dense"
                displayValue={common.vehicle}
                placeholder="Search vehicle…"
                onSelect={(row) => onChange('vehicle', row.number ?? '')}
              />
            </Field>
            <Field>
              <DriverMasterSelect
                label="Driver / Transporter"
                variant="dense"
                displayValue={common.driver}
                placeholder="Search driver…"
                onSelect={(row) => onChange('driver', row.name ?? '')}
              />
            </Field>
            <Field>
              <Select
                label="Type"
                options={LR_BUSINESS_TYPES.map((t) => ({ value: t, label: t }))}
                value={common.businessType}
                onChange={(e) => onChange('businessType', e.target.value)}
              />
            </Field>
            <Field>
              <Input
                label="LR Date *"
                type="date"
                value={common.lrDate}
                error={errors.lrDate}
                onChange={(e) => onChange('lrDate', e.target.value)}
              />
            </Field>
            <Field>
              <Input label="LR Series" value="Auto" readOnly title="Allocated on save" />
            </Field>
            <Field className="bulk-lr-span-2">
              <Input
                label="Default E-Way Bill"
                value={common.ewayBillNo}
                onChange={(e) => onChange('ewayBillNo', e.target.value)}
                placeholder="Optional — used when row E-Way is empty"
              />
            </Field>
          </div>
        </div>

        <aside className="bulk-lr-common-options">
          <p className="bulk-lr-block-label">Auto Fill Options</p>
          <label className="bulk-lr-check">
            <input
              type="checkbox"
              checked={!!common.autoCalculate}
              onChange={(e) => onChange('autoCalculate', e.target.checked)}
            />
            Auto Calculate Freight
          </label>
          <label className="bulk-lr-check">
            <input
              type="checkbox"
              checked={!!common.autoWeightTotal}
              onChange={(e) => onChange('autoWeightTotal', e.target.checked)}
            />
            Auto Weight Total
          </label>
          <label className="bulk-lr-check bulk-lr-check-disabled">
            <input type="checkbox" checked readOnly disabled />
            Auto LR Number
          </label>
          <label className="bulk-lr-check">
            <input
              type="checkbox"
              checked={!!common.rememberLast}
              onChange={(e) => onChange('rememberLast', e.target.checked)}
            />
            Remember Last Values
          </label>
        </aside>
      </div>
    </section>
  )
}
