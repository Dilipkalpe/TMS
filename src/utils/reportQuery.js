function localDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function toReportQuery(filters = {}) {
  const q = {}
  if (filters.fromDate) q.fromDate = filters.fromDate
  if (filters.toDate) q.toDate = filters.toDate
  if (filters.customerId) q.customerId = filters.customerId
  if (filters.vendorId) q.vendorId = filters.vendorId
  return q
}

export function defaultReportFilters() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    fromDate: localDateString(from),
    toDate: localDateString(now),
    customerId: '',
    vendorId: '',
  }
}
