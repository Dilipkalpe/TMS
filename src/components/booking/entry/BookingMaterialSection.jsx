import Input from '../../ui/Input'
import ItemMasterSelect from '../../masters/ItemMasterSelect'
import LrEntrySectionCard from '../../lr/entry/LrEntrySectionCard'
import { fieldLabel, fieldRequired, fieldVisible } from '../../../utils/fieldConfig'

export default function BookingMaterialSection({
  form,
  setForm,
  update,
  errors = {},
  fieldMap = {},
  disabled = false,
}) {
  const label = (key, fallback) => fieldLabel(fieldMap, key, fallback)
  const req = (key) => fieldRequired(fieldMap, key)
  const vis = (key) => fieldVisible(fieldMap, key)
  const showMaterial = vis('Material')
  const showQuantity = vis('Quantity')
  if (!showMaterial && !showQuantity) return null

  return (
    <LrEntrySectionCard title="3. Material Information" id="booking-section-material">
      <div className="lr-entry-v2-grid lr-entry-v2-grid--info">
        {showMaterial && (
          <div id="booking-field-material">
            <ItemMasterSelect
              label={`${label('Material', 'Material')}${req('Material') ? ' *' : ''}`}
              valueId={form.materialId}
              displayValue={form.material}
              placeholder="Search material master…"
              disabled={disabled}
              onSelect={(row) => {
                if (setForm) {
                  setForm((prev) => ({
                    ...prev,
                    materialId: row?.id || '',
                    material: row?.name || '',
                  }))
                } else {
                  update('materialId', row?.id || '')
                  update('material', row?.name || '')
                }
              }}
            />
            {errors.material ? <p className="mt-1 text-xs text-red-500">{errors.material}</p> : null}
          </div>
        )}
        {showQuantity && (
          <Input
            id="booking-field-quantity"
            label={label('Quantity', 'Quantity')}
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            placeholder="e.g. 12 MT / 10 pkgs"
            required={req('Quantity')}
            error={errors.quantity}
            disabled={disabled}
          />
        )}
      </div>
    </LrEntrySectionCard>
  )
}
