export const LOOKUP_CREATED_EVENT = 'tms-lookup-created'

/** Notify all LookupSelect instances that a master record was created. */
export function notifyLookupCreated(detail) {
  window.dispatchEvent(new CustomEvent(LOOKUP_CREATED_EVENT, { detail }))
}

export function lookupEventMatches(detail, type, employeeType) {
  if (!detail) return false

  const isDriverField = type === 'drivers' || (type === 'employees' && employeeType === 'Driver')
  const detailIsDriver = detail.type === 'drivers'
    || (detail.type === 'employees' && detail.employeeType === 'Driver')
  if (isDriverField && detailIsDriver) return true

  if (detail.type !== type) return false
  if (type === 'employees' && employeeType && detail.employeeType !== employeeType) return false
  return true
}
