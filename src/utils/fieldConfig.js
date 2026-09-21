/** Shared helpers for Booking/LR dynamic field configuration. */

export function effectiveDisplayName(field, fallback = '') {
  if (!field) return fallback
  const custom = field.customDisplayName?.trim()
  if (custom) return custom
  return field.displayName || field.defaultDisplayName || fallback
}

export function isFieldVisible(field) {
  if (!field) return true
  return field.isActive !== false && field.isVisible !== false
}

export function mustValidateField(field) {
  return isFieldVisible(field) && field?.isRequired === true
}

export function fieldLabel(map, technicalName, fallback) {
  const field = map?.[technicalName]
  return effectiveDisplayName(field, fallback)
}

export function fieldRequired(map, technicalName) {
  return mustValidateField(map?.[technicalName])
}

export function fieldVisible(map, technicalName) {
  return isFieldVisible(map?.[technicalName])
}

export function requiredMessage(map, technicalName, fallbackLabel) {
  return `${fieldLabel(map, technicalName, fallbackLabel)} is required.`
}

/**
 * Build a map technicalFieldName -> config from API items.
 * Sorted list by displayOrder for rendering.
 */
export function toFieldConfigMap(items = []) {
  const map = {}
  for (const item of items) {
    if (!item?.technicalFieldName) continue
    // Keep inactive entries so isFieldVisible / mustValidateField honor isActive=false.
    map[item.technicalFieldName] = item
  }
  return map
}

export function sortByDisplayOrder(items = []) {
  return [...items].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    || String(a.technicalFieldName).localeCompare(String(b.technicalFieldName)))
}

/** Defaults matching FieldConfigurationCatalog when API map is empty. */
const BOOKING_DEFAULT_REQUIRED = new Set(['Date', 'Consignor', 'Consignee', 'From', 'To'])
const LR_DEFAULT_REQUIRED = new Set(['LrDate', 'BusinessType', 'Consignor', 'Consignee', 'From', 'To'])

function mapHasConfig(map) {
  return map && Object.keys(map).length > 0
}

function isRequired(map, key, defaultSet) {
  if (mapHasConfig(map)) return mustValidateField(map[key])
  return defaultSet.has(key)
}

/** Validate booking form values against field config. Returns first error message or null. */
export function validateBookingForm(form, map) {
  const checks = [
    ['Consignor', form.consignor || form.consignorId, 'Consignor'],
    ['Consignee', form.consignee || form.consigneeId, 'Consignee'],
    ['From', form.from, 'From'],
    ['To', form.to, 'To'],
    ['Date', form.date, 'Booking Date'],
    ['Material', form.material || form.materialId, 'Material'],
    ['Quantity', form.quantity, 'Quantity'],
    ['Vehicle', form.vehicle, 'Vehicle'],
    ['Driver', form.driver, 'Driver'],
    ['Payment', form.payment, 'Payment Status'],
    ['Remarks', form.remarks, 'Remarks'],
  ]
  for (const [key, value, fallback] of checks) {
    if (isRequired(map, key, BOOKING_DEFAULT_REQUIRED) && !String(value ?? '').trim()) {
      return requiredMessage(map, key, fallback)
    }
  }
  return null
}

/** Build field errors object for Booking entry forms (aligned with backend ValidateBookingFieldsAsync). */
export function buildBookingFieldErrors(form, map = {}) {
  const errors = {}
  if (isRequired(map, 'Date', BOOKING_DEFAULT_REQUIRED) && !form.date?.trim()) {
    errors.date = requiredMessage(map, 'Date', 'Booking Date')
  }
  if (isRequired(map, 'Consignor', BOOKING_DEFAULT_REQUIRED) && !form.consignorId && !form.consignor?.trim()) {
    errors.consignor = `Please select ${fieldLabel(map, 'Consignor', 'Consignor')}.`
  }
  if (isRequired(map, 'Consignee', BOOKING_DEFAULT_REQUIRED) && !form.consigneeId && !form.consignee?.trim()) {
    errors.consignee = `Please select ${fieldLabel(map, 'Consignee', 'Consignee')}.`
  }
  if (isRequired(map, 'From', BOOKING_DEFAULT_REQUIRED) && !form.from?.trim()) {
    errors.from = requiredMessage(map, 'From', 'From')
  }
  if (isRequired(map, 'To', BOOKING_DEFAULT_REQUIRED) && !form.to?.trim()) {
    errors.to = requiredMessage(map, 'To', 'To')
  }
  if (isRequired(map, 'Material', BOOKING_DEFAULT_REQUIRED) && !form.materialId && !form.material?.trim()) {
    errors.material = requiredMessage(map, 'Material', 'Material')
  }
  if (isRequired(map, 'Quantity', BOOKING_DEFAULT_REQUIRED) && !String(form.quantity ?? '').trim()) {
    errors.quantity = requiredMessage(map, 'Quantity', 'Quantity')
  }
  if (isRequired(map, 'Vehicle', BOOKING_DEFAULT_REQUIRED) && !String(form.vehicle ?? '').trim()) {
    errors.vehicle = requiredMessage(map, 'Vehicle', 'Vehicle')
  }
  if (isRequired(map, 'Driver', BOOKING_DEFAULT_REQUIRED) && !String(form.driver ?? '').trim()) {
    errors.driver = requiredMessage(map, 'Driver', 'Driver')
  }
  if (isRequired(map, 'Payment', BOOKING_DEFAULT_REQUIRED) && !String(form.payment ?? '').trim()) {
    errors.payment = requiredMessage(map, 'Payment', 'Payment Status')
  }
  if (isRequired(map, 'Remarks', BOOKING_DEFAULT_REQUIRED) && !String(form.remarks ?? '').trim()) {
    errors.remarks = requiredMessage(map, 'Remarks', 'Remarks')
  }
  if (isRequired(map, 'Freight', BOOKING_DEFAULT_REQUIRED) && !(Number(form.freight) > 0)) {
    errors.freight = requiredMessage(map, 'Freight', 'Freight')
  }
  if (isRequired(map, 'Advance', BOOKING_DEFAULT_REQUIRED) && Number(form.advance) < 0) {
    errors.advance = requiredMessage(map, 'Advance', 'Advance')
  }
  return errors
}

/** Build field errors object for LR entry forms. */
export function buildLrFieldErrors(form, map = {}) {
  const errors = {}
  if (isRequired(map, 'LrDate', LR_DEFAULT_REQUIRED) && !form.lrDate?.trim()) {
    errors.lrDate = requiredMessage(map, 'LrDate', 'LR Date')
  }
  if (isRequired(map, 'Consignor', LR_DEFAULT_REQUIRED) && !form.consignorId && !form.consignor?.trim()) {
    errors.consignor = `Please select ${fieldLabel(map, 'Consignor', 'Consignor')}.`
  }
  if (isRequired(map, 'Consignee', LR_DEFAULT_REQUIRED) && !form.consigneeId && !form.consignee?.trim()) {
    errors.consignee = `Please select ${fieldLabel(map, 'Consignee', 'Consignee')}.`
  }
  if (isRequired(map, 'From', LR_DEFAULT_REQUIRED) && !form.from?.trim() && !form.pickupCity?.trim()) {
    errors.from = requiredMessage(map, 'From', 'Pickup city')
  }
  if (isRequired(map, 'To', LR_DEFAULT_REQUIRED) && !form.to?.trim()) {
    errors.to = requiredMessage(map, 'To', 'Delivery city')
  }
  return errors
}
