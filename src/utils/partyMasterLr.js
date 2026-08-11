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

/** Merge party master into form and sync route cities (pickup / delivery). */
export function applyConsignorPartyToForm(prev, row) {
  if (!row) return prev
  const applied = applyConsignorToLrForm(row)
  const origin = (applied.from || row.city || '').trim()
  return {
    ...prev,
    ...applied,
    from: origin,
    pickupCity: origin,
    pickupAddress: row.address || prev.pickupAddress,
  }
}

export function applyConsigneePartyToForm(prev, row) {
  if (!row) return prev
  const applied = applyConsigneeToLrForm(row)
  const dest = (applied.to || row.defaultToLocation || row.city || '').trim()
  return {
    ...prev,
    ...applied,
    to: dest,
    deliveryBranch: dest || prev.deliveryBranch,
  }
}

/** Normalize route city fields before validate / save. */
export function syncLrRouteFields(form) {
  const from = (form.pickupCity || form.from || '').trim()
  const to = (form.to || '').trim()
  return { ...form, from, pickupCity: from, to }
}

export function partyDisplayLabel(row) {
  if (!row) return ''
  const name = row.companyName || row.name
  return row.city ? `${name}, ${row.city}` : name
}
