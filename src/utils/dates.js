/** Normalize date input to YYYY-MM-DD for API (handles empty, ISO datetime, dd/mm/yyyy). */
export function normalizeDateForApi(value) {
  if (value == null || value === '') return null
  const s = String(value).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10)
  const parts = s.split(/[/-]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
    }
    const [d, m, y] = parts
    if (y?.length === 4) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  return s
}
