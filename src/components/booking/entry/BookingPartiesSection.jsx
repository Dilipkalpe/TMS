import PartyMasterSelect from '../../masters/PartyMasterSelect'
import { consignorsApi, consigneesApi } from '../../../services/api'
import { applyConsignorToLrForm, applyConsigneeToLrForm } from '../../../utils/partyMasterLr'
import LrEntrySectionCard from '../../lr/entry/LrEntrySectionCard'
import { fieldLabel, fieldRequired, fieldVisible } from '../../../utils/fieldConfig'

function PartyCard({ title, required, search, details, error }) {
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

export default function BookingPartiesSection({
  form,
  setForm,
  onClearFieldErrors,
  errors = {},
  fieldMap = {},
  disabled = false,
}) {
  const label = (key, fallback) => fieldLabel(fieldMap, key, fallback)
  const req = (key) => fieldRequired(fieldMap, key)
  const vis = (key) => fieldVisible(fieldMap, key)
  const showConsignor = vis('Consignor')
  const showConsignee = vis('Consignee')
  if (!showConsignor && !showConsignee) return null

  return (
    <LrEntrySectionCard title="2. Party Information" id="booking-section-parties">
      <div className="lr-entry-v2-party-grid">
        {showConsignor && (
          <PartyCard
            title={label('Consignor', 'Consignor')}
            required={req('Consignor')}
            error={errors.consignor}
            search={(
              <div id="booking-field-consignor">
                <PartyMasterSelect
                  label={false}
                  api={consignorsApi}
                  masterKey="consignors"
                  valueId={form.consignorId}
                  displayValue={form.consignor}
                  placeholder="Search by name, city, GSTIN, mobile…"
                  disabled={disabled}
                  onSelect={(row) => {
                    const applied = applyConsignorToLrForm(row)
                    setForm((prev) => ({
                      ...prev,
                      ...applied,
                      from: applied.from || prev.from,
                    }))
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
        )}
        {showConsignee && (
          <PartyCard
            title={label('Consignee', 'Consignee')}
            required={req('Consignee')}
            error={errors.consignee}
            search={(
              <div id="booking-field-consignee">
                <PartyMasterSelect
                  label={false}
                  api={consigneesApi}
                  masterKey="consignees"
                  valueId={form.consigneeId}
                  displayValue={form.consignee}
                  placeholder="Search by name, city, GSTIN, mobile…"
                  disabled={disabled}
                  onSelect={(row) => {
                    const applied = applyConsigneeToLrForm(row)
                    setForm((prev) => ({
                      ...prev,
                      ...applied,
                      to: applied.to || prev.to,
                    }))
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
        )}
      </div>
    </LrEntrySectionCard>
  )
}
