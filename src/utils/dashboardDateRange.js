/** Format Date as yyyy-MM-dd for input type="date" (local timezone). */
export function toInputDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Default dashboard range: last 30 days (inclusive).
 * All-time aggregates are too slow on large LR history and block first paint.
 */
export function defaultDashboardDateRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return { dateFrom: toInputDate(from), dateTo: toInputDate(to) }
}

export function formatDashboardRangeLabel(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return 'All time'
  const fmt = (s) => {
    if (!s) return '…'
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }
  return `${fmt(dateFrom)} – ${fmt(dateTo)}`
}
