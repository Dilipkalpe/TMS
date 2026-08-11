/** Build result-count label for lookup dropdown header. */
export function buildLookupCountText({
  loading,
  query,
  optionCount,
  totalCount,
  showNotFound,
}) {
  if (loading) return 'Searching…'
  if (showNotFound || optionCount === 0) return 'No records found'

  const q = query?.trim()
  if (q) {
    if (totalCount != null && totalCount > optionCount) {
      return `${optionCount} matching records`
    }
    return `${optionCount} matching record${optionCount === 1 ? '' : 's'}`
  }

  const total = totalCount ?? optionCount
  return `${total} record${total === 1 ? '' : 's'} found`
}

/** Primary + secondary lines for party/consignor/consignee rows. */
export function partyDisplayLines(row) {
  const primary = (row.name || row.companyName || '').trim()
  const company = (row.companyName || '').trim()
  const city = (row.city || '').trim()

  const secondaryParts = []
  if (company && company !== primary) secondaryParts.push(company)
  if (city) secondaryParts.push(city)

  let secondary = secondaryParts.join(' · ')
  const gst = row.gst || row.gstin || row.gstNo
  if (gst) {
    secondary = secondary ? `${secondary}   GST ${gst}` : `GST ${gst}`
  }

  return { primary: primary || company || '—', secondary }
}
