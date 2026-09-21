const FIELD_ORDER = [
  'bookingId', 'lrNumber', 'lrDate', 'date', 'branchName',
  'consignor', 'consignee', 'from', 'to', 'material', 'quantity', 'vehicle', 'driver',
]

const FIELD_TARGETS = {
  bookingId: { scrollId: 'lr-booking-field', focus: '#lr-booking-field select, #lr-booking-field input' },
  lrNumber: { scrollId: 'booking-lr-field', focus: '#booking-lr-field select, #booking-lr-field input' },
  lrDate: { scrollId: 'lr-section-info', focus: '#lr-field-lr-date' },
  date: { scrollId: 'booking-section-info', focus: '#booking-field-date' },
  branchName: { scrollId: 'booking-section-info', focus: '#booking-field-branch' },
  consignor: {
    scrollId: 'booking-section-parties',
    focus: '#booking-field-consignor input, #booking-field-consignor button, #lr-field-consignor input, #lr-field-consignor button',
  },
  consignee: {
    scrollId: 'booking-section-parties',
    focus: '#booking-field-consignee input, #booking-field-consignee button, #lr-field-consignee input, #lr-field-consignee button',
  },
  from: { scrollId: 'booking-section-transport', focus: '#booking-field-from, #lr-field-from' },
  to: { scrollId: 'booking-section-transport', focus: '#booking-field-to, #lr-field-to' },
  material: { scrollId: 'booking-section-material', focus: '#booking-field-material input, #booking-field-material button' },
  quantity: { scrollId: 'booking-section-material', focus: '#booking-field-quantity' },
  vehicle: { scrollId: 'booking-section-transport', focus: '#booking-field-vehicle input, #booking-field-vehicle button' },
  driver: { scrollId: 'booking-section-transport', focus: '#booking-field-driver input, #booking-field-driver button' },
}

function resolveScrollId(key, target) {
  if (target?.scrollId && document.getElementById(target.scrollId)) return target.scrollId
  // Prefer booking ids, then LR ids for shared field keys
  if (document.getElementById(`booking-field-${key}`)) return `booking-field-${key}`
  if (document.getElementById(`lr-field-${key}`)) return `lr-field-${key}`
  if (key === 'consignor' || key === 'consignee') {
    if (document.getElementById('booking-section-parties')) return 'booking-section-parties'
    if (document.getElementById('lr-section-parties')) return 'lr-section-parties'
  }
  if (key === 'from' || key === 'to') {
    if (document.getElementById('booking-section-transport')) return 'booking-section-transport'
    if (document.getElementById('lr-section-route')) return 'lr-section-route'
  }
  return target?.scrollId ?? null
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
  const scrollId = resolveScrollId(key, target)
  if (!scrollId) return
  document.getElementById(scrollId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function focusFirstFieldError(errors) {
  const key = getFirstFieldErrorKey(errors)
  if (!key) return

  const target = FIELD_TARGETS[key]
  scrollToFirstFieldError(errors)

  window.setTimeout(() => {
    if (!target?.focus) return
    const el = document.querySelector(target.focus)
    el?.focus?.({ preventScroll: true })
  }, 280)
}
