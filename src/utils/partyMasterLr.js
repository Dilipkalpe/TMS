/** Auto-fill LR form from consignor / consignee master records. */
export function applyConsignorToLrForm(row) {
  if (!row) return {}
  return {
    consignorId: row.id,
    consignor: row.companyName || row.name,
    consignorContact: row.contact ?? '',
    consignorPhone: row.phone ?? '',
    consignorGst: row.gst ?? '',
    consignorAddress: row.address ?? '',
    from: row.defaultFromLocation || row.city || '',
  }
}

export function applyConsigneeToLrForm(row) {
  if (!row) return {}
  return {
    consigneeId: row.id,
    consignee: row.companyName || row.name,
    consigneeContact: row.contact ?? '',
    consigneePhone: row.phone ?? '',
    consigneeGst: row.gst ?? '',
    consigneeAddress: row.address ?? '',
    to: row.defaultToLocation || row.city || '',
  }
}

export function partyDisplayLabel(row) {
  if (!row) return ''
  const name = row.companyName || row.name
  return row.city ? `${name}, ${row.city}` : name
}
