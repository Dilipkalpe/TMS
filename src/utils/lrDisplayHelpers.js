/** Derive mockup-style status badges from LR workflow status. */
/** Map mockup status pill colors to Badge variants. */
export function lrStatusBadgeVariant(mockupVariant = '') {
  if (mockupVariant === 'Paid') return 'success'
  if (mockupVariant === 'InTransit') return 'info'
  if (mockupVariant === 'Pending') return 'warning'
  return 'default'
}

export function lrDeliveryStatus(status = '') {
  const s = status || 'LR Created'
  if (['Delivery Completed', 'POD Uploaded', 'Invoice Generated', 'Expense Added', 'Expense Approved', 'Closed'].includes(s)) {
    return { label: 'Delivered', variant: 'Paid' }
  }
  if (['In Transit', 'Transit Pass Generated'].includes(s)) {
    return { label: 'In Transit', variant: 'InTransit' }
  }
  return { label: 'Pending', variant: 'Pending' }
}

export function lrBillingStatus(status = '') {
  const s = status || 'LR Created'
  if (['Invoice Generated', 'Expense Added', 'Expense Approved', 'Closed'].includes(s)) {
    return { label: 'Billed', variant: 'Paid' }
  }
  return { label: 'Unbilled', variant: 'Pending' }
}

export function lrPodStatus(status = '') {
  const s = status || 'LR Created'
  if (['POD Uploaded', 'Invoice Generated', 'Expense Added', 'Expense Approved', 'Closed'].includes(s)) {
    return { label: 'Completed', variant: 'Paid' }
  }
  return { label: 'Pending', variant: 'Pending' }
}

export function lrTotalAmount(row) {
  const freight = Number(row.freight) || 0
  const gst = Number(row.gst) || 0
  const hamali = Number(row.hamali) || 0
  const loading = Number(row.loadingCharges) || 0
  const unloading = Number(row.unloadingCharges) || 0
  const insurance = Number(row.insurance) || 0
  return freight + gst + hamali + loading + unloading + insurance
}

export function parsePackagesWeight(quantity) {
  if (!quantity) return { packages: '—', weight: '—' }
  const str = String(quantity)
  const pkgMatch = str.match(/(\d+)\s*pkg/i)
  const wtMatch = str.match(/([\d.]+)\s*kg/i)
  return {
    packages: pkgMatch ? pkgMatch[1] : str.split('/')[0]?.trim() || str,
    weight: wtMatch ? wtMatch[1] : str.split('/')[1]?.trim() || '—',
  }
}

export function formatLrDate(d) {
  if (!d) return '—'
  const parts = String(d).split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return d
}
