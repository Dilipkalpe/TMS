/**
 * Shared display helper for Vehicle Master + Driver Master current location.
 * Backend returns a human-readable "Area, City, State" label (never lat/lng).
 */
export function formatCurrentLocation(label) {
  if (label == null) return '—'
  const text = String(label).trim()
  if (!text) return '—'
  // Avoid double pin if already prefixed
  if (text.startsWith('📍')) return text
  return `📍 ${text}`
}
