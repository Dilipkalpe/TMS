/** Build one-line active filter chips from applied LR list filters. */
export function buildLrActiveFilterChips(filters) {
  const chips = []
  const add = (id, keys, text) => {
    if (!text) return
    chips.push({ id, keys, text })
  }

  if (filters.dateFrom || filters.dateTo) {
    const from = formatChipDate(filters.dateFrom)
    const to = formatChipDate(filters.dateTo)
    add('date', ['dateFrom', 'dateTo'], `Date: ${from || '…'} → ${to || '…'}`)
  }
  if (filters.lrNo?.trim()) add('lrNo', ['lrNo'], `LR No: ${filters.lrNo.trim()}`)
  if (filters.customer?.trim()) add('customer', ['customer'], `Customer: ${filters.customer.trim()}`)
  if (filters.consignee?.trim()) add('consignee', ['consignee'], `Consignee: ${filters.consignee.trim()}`)
  if (filters.fromCity?.trim()) add('fromCity', ['fromCity'], `From: ${filters.fromCity.trim()}`)
  if (filters.toCity?.trim()) add('toCity', ['toCity'], `To: ${filters.toCity.trim()}`)
  if (filters.vehicle?.trim()) add('vehicle', ['vehicle'], `Vehicle: ${filters.vehicle.trim()}`)
  if (filters.branch && filters.branch !== '(All)') add('branch', ['branch'], `Branch: ${filters.branch}`)
  if (filters.status && filters.status !== '(All)') add('status', ['status'], `Status: ${filters.status}`)
  if (filters.bookingType && filters.bookingType !== '(All)') add('bookingType', ['bookingType'], `Booking: ${filters.bookingType}`)
  if (filters.freightType && filters.freightType !== '(All)') add('freightType', ['freightType'], `Freight: ${filters.freightType}`)

  return chips
}

export function clearLrFilterKeys(filters, keys) {
  const next = { ...filters }
  keys.forEach((k) => {
    if (['status', 'bookingType', 'freightType', 'branch'].includes(k)) next[k] = '(All)'
    else next[k] = ''
  })
  return next
}

function formatChipDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
