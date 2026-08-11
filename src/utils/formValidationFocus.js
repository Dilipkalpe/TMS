const FIELD_ORDER = ['bookingId', 'lrDate', 'branchName', 'consignor', 'consignee', 'from', 'to']

const FIELD_TARGETS = {
  bookingId: { scrollId: 'lr-booking-field', focus: '#lr-booking-field select, #lr-booking-field input' },
  lrDate: { scrollId: 'lr-section-info', focus: '#lr-field-lr-date' },
  branchName: { scrollId: 'lr-section-info', focus: '#lr-field-branch' },
  consignor: { scrollId: 'lr-section-parties', focus: '#lr-field-consignor input, #lr-field-consignor button' },
  consignee: { scrollId: 'lr-section-parties', focus: '#lr-field-consignee input, #lr-field-consignee button' },
  from: { scrollId: 'lr-section-route', focus: '#lr-field-from' },
  to: { scrollId: 'lr-section-route', focus: '#lr-field-to' },
}

export function getFirstFieldErrorKey(errors) {
  if (!errors || typeof errors !== 'object') return null
  const ordered = FIELD_ORDER.find((key) => errors[key])
  return ordered ?? Object.keys(errors)[0] ?? null
}

export function scrollToFirstFieldError(errors) {
  const key = getFirstFieldErrorKey(errors)
  if (!key) return

  const target = FIELD_TARGETS[key]
  if (!target) return

  document.getElementById(target.scrollId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function focusFirstFieldError(errors) {
  const key = getFirstFieldErrorKey(errors)
  if (!key) return

  const target = FIELD_TARGETS[key]
  if (!target) return

  scrollToFirstFieldError(errors)

  window.setTimeout(() => {
    const el = document.querySelector(target.focus)
    el?.focus?.({ preventScroll: true })
  }, 280)
}
