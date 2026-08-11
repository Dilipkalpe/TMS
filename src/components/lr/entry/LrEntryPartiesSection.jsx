import { Copy } from 'lucide-react'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import PartyMasterSelect from '../../masters/PartyMasterSelect'
import { consignorsApi, consigneesApi, customersApi } from '../../../services/api'
import { applyConsignorPartyToForm, applyConsigneePartyToForm } from '../../../utils/partyMasterLr'
import LrEntrySectionCard from './LrEntrySectionCard'

function PartyCard({
  title,
  required,
  searchLabel,
  search,
  details,
  error,
}) {
  return (
    <div className="lr-entry-v2-party-card">
      <p className="lr-entry-v2-party-card-title">
        {title}
        {required ? <span className="text-red-500"> *</span> : null}
      </p>
      {search}
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
      {details}
    </div>
  )
}

function PartyDetails({ name, address, gstin, mobile }) {
  if (!name && !address && !gstin && !mobile) return null
  return (
    <div className="lr-entry-v2-party-details">
      {name ? <p className="lr-entry-v2-party-name">{name}</p> : null}
      {address ? <p className="lr-entry-v2-party-line">{address}</p> : null}
      <div className="lr-entry-v2-party-meta">
        {gstin ? <span>GSTIN: {gstin}</span> : null}
        {mobile ? <span>Mobile: {mobile}</span> : null}
      </div>
    </div>
  )
}

export default function LrEntryPartiesSection({
  form,
  setForm,
  update,
  billingMode,
  onBillingModeChange,
  onCopyBillingFromConsignor,
  onClearFieldErrors,
  errors = {},
}) {
  return (
    <LrEntrySectionCard title="2. Parties" id="lr-section-parties">
      <div className="lr-entry-v2-party-grid">
        <PartyCard
          title="Consignor (From)"
          required
          error={errors.consignor}
          search={(
            <div id="lr-field-consignor">
              <PartyMasterSelect
                label={false}
                api={consignorsApi}
                valueId={form.consignorId}
                displayValue={form.consignor}
                placeholder="Search by name, city, GSTIN, mobile…"
                onSelect={(row) => {
                  setForm((prev) => applyConsignorPartyToForm(prev, row))
                  onClearFieldErrors?.(['consignor', 'from'])
                }}
              />
            </div>
          )}
          details={(
            <PartyDetails
              name={form.consignor}
              address={form.consignorAddress}
              gstin={form.consignorGst}
              mobile={form.consignorPhone}
            />
          )}
        />

        <PartyCard
          title="Consignee (To)"
          required
          error={errors.consignee}
          search={(
            <div id="lr-field-consignee">
              <PartyMasterSelect
                label={false}
                api={consigneesApi}
                valueId={form.consigneeId}
                displayValue={form.consignee}
                placeholder="Search by name, city, GSTIN, mobile…"
                onSelect={(row) => {
                  setForm((prev) => applyConsigneePartyToForm(prev, row))
                  onClearFieldErrors?.(['consignee', 'to'])
                }}
              />
            </div>
          )}
          details={(
            <PartyDetails
              name={form.consignee}
              address={form.consigneeAddress}
              gstin={form.consigneeGst}
              mobile={form.consigneePhone}
            />
          )}
        />

        <PartyCard
          title="Billing Party"
          search={(
            <div className="space-y-2">
              <fieldset className="lr-entry-v2-billing-options">
                <legend className="sr-only">Billing party source</legend>
                <label className="lr-entry-v2-radio">
                  <input
                    type="radio"
                    name="billingMode"
                    checked={billingMode === 'consignor'}
                    onChange={() => onBillingModeChange('consignor')}
                  />
                  Same as Consignor
                </label>
                <label className="lr-entry-v2-radio">
                  <input
                    type="radio"
                    name="billingMode"
                    checked={billingMode === 'consignee'}
                    onChange={() => onBillingModeChange('consignee')}
                  />
                  Same as Consignee
                </label>
                <label className="lr-entry-v2-radio">
                  <input
                    type="radio"
                    name="billingMode"
                    checked={billingMode === 'custom'}
                    onChange={() => onBillingModeChange('custom')}
                  />
                  Select Party
                </label>
              </fieldset>

              {billingMode === 'custom' ? (
                <PartyMasterSelect
                  label={false}
                  api={customersApi}
                  valueId={form.billingPartyId}
                  displayValue={form.billingParty}
                  placeholder="Search billing party…"
                  onSelect={(row) => setForm((prev) => ({
                    ...prev,
                    billingPartyId: row.id,
                    billingParty: row.companyName || row.name,
                    billingPartyAddress: row.address ?? '',
                    billingPartyGst: row.gst ?? '',
                    billingPartyPhone: row.phone ?? '',
                    customerName: row.companyName || row.name,
                  }))}
                />
              ) : null}

              <Button
                size="sm"
                variant="outline"
                type="button"
                icon={Copy}
                onClick={onCopyBillingFromConsignor}
              >
                Copy From Consignor
              </Button>
            </div>
          )}
          details={(
            <PartyDetails
              name={form.billingParty}
              address={form.billingPartyAddress}
              gstin={form.billingPartyGst}
              mobile={form.billingPartyPhone}
            />
          )}
        />
      </div>

      <div className="lr-entry-v2-party-edit-grid">
        <Input label="Consignor Address" value={form.consignorAddress} onChange={(e) => update('consignorAddress', e.target.value)} />
        <Input label="Consignor GSTIN" value={form.consignorGst} onChange={(e) => update('consignorGst', e.target.value)} />
        <Input label="Consignor Mobile" value={form.consignorPhone} onChange={(e) => update('consignorPhone', e.target.value)} />
        <Input label="Consignee Address" value={form.consigneeAddress} onChange={(e) => update('consigneeAddress', e.target.value)} />
        <Input label="Consignee GSTIN" value={form.consigneeGst} onChange={(e) => update('consigneeGst', e.target.value)} />
        <Input label="Consignee Mobile" value={form.consigneePhone} onChange={(e) => update('consigneePhone', e.target.value)} />
      </div>
    </LrEntrySectionCard>
  )
}
