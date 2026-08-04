/** Encode document numbers for URL path segments (slashes break React Router / API routes). */
export function toDocPath(id) {
  if (id == null || id === '') return ''
  return String(id).replaceAll('/', '~')
}

/** Decode a path-safe document id back to the stored number. */
export function fromDocPath(id) {
  if (id == null || id === '') return ''
  try {
    return decodeURIComponent(String(id)).replaceAll('~', '/')
  } catch {
    return String(id).replaceAll('~', '/')
  }
}

export function bookingPath(id, suffix = '') {
  const base = `/bookings/${toDocPath(id)}`
  return suffix ? `${base}/${suffix}` : base
}

export function lrEditPath(lrNumber) {
  return `/lr/${toDocPath(lrNumber)}/edit`
}

export function lrProcessPath(lrNumber, step) {
  const base = `/lr/${toDocPath(lrNumber)}/process`
  return step ? `${base}?step=${encodeURIComponent(step)}` : base
}
