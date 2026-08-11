/** Operational workflow status helpers (LR-process aligned). */

export const WORKFLOW_STEPS = [
  { id: 'lr', label: 'LR', path: (lr) => `/lr/detail/${encodeURIComponent(lr)}` },
  { id: 'loading', label: 'Loading Slip', path: (lr) => `/operations/loading-slip?lr=${encodeURIComponent(lr)}` },
  { id: 'transit', label: 'Transit Pass', path: (lr) => `/operations/transit-pass?lr=${encodeURIComponent(lr)}` },
  { id: 'dispatch', label: 'Dispatch', path: (lr) => `/operations/dispatch?lr=${encodeURIComponent(lr)}` },
  { id: 'in-transit', label: 'In Transit', path: (lr) => `/operations/in-transit?lr=${encodeURIComponent(lr)}` },
  { id: 'delivery', label: 'Delivery', path: (lr) => `/operations/delivery-complete?lr=${encodeURIComponent(lr)}` },
  { id: 'pod', label: 'POD', path: (lr) => `/operations/delivery/pod?lr=${encodeURIComponent(lr)}` },
  { id: 'billing', label: 'Billing', path: (lr) => `/operations/billing/invoice?lr=${encodeURIComponent(lr)}` },
]

export function deriveTransitPassStatus(lr, pass) {
  if (!pass) return 'Draft'
  const ext = pass.extendedData || {}
  if (ext.passStatus === 'Cancelled' || pass.passStatus === 'Cancelled') return 'Cancelled'
  if (ext.passStatus) return ext.passStatus
  if (pass.passStatus) return pass.passStatus
  if (lr?.status === 'In Transit') return 'Dispatched'
  if (lr?.status === 'Transit Pass Generated') return 'Ready for Dispatch'
  return 'Draft'
}

export function deriveDispatchStatus(lr, delivery) {
  if (!delivery) return lr?.status === 'Transit Pass Generated' ? 'Pending' : '—'
  if (delivery.shipmentStatus === 'In Transit') return 'Dispatched'
  return delivery.extendedData?.dispatch?.dispatchNo ? 'Dispatched' : 'Pending'
}

export function deriveInTransitStatus(delivery) {
  return delivery?.inTransitStatus
    || delivery?.extendedData?.inTransitStatus
    || (delivery?.shipmentStatus === 'In Transit' ? 'In Transit' : '—')
}

export function derivePodVerificationStatus(delivery) {
  return delivery?.podVerificationStatus
    || delivery?.extendedData?.podVerification?.status
    || (delivery?.shipmentStatus === 'POD Received' ? 'Verified' : 'Pending')
}

export function activeWorkflowStep(lr, process) {
  const s = lr?.status || ''
  if (s === 'Closed') return 'billing'
  if (s === 'Invoice Generated' || s === 'Expense Added' || s === 'Expense Approved') return 'billing'
  if (s === 'POD Uploaded') return 'pod'
  if (s === 'Delivery Completed') return 'pod'
  if (s === 'In Transit') {
    const inTransitStatus = deriveInTransitStatus(process?.deliverySheet)
    if (inTransitStatus === 'Reached Destination') return 'delivery'
    return process?.deliverySheet ? 'in-transit' : 'dispatch'
  }
  if (s === 'Transit Pass Generated') return 'dispatch'
  if (s === 'Loading Completed') return 'transit'
  return 'lr'
}

export function statusBadgeVariant(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('cancel') || s.includes('reject') || s.includes('fail')) return 'Cancelled'
  if (s.includes('deliver') || s.includes('complete') || s.includes('verified')) return 'Paid'
  if (s.includes('transit') || s.includes('dispatch')) return 'info'
  if (s.includes('pending') || s.includes('draft')) return 'Pending'
  if (s.includes('delay')) return 'warning'
  return 'outline'
}

/** Deep-merge extendedData objects (client-side guard before save). */
export function mergeExtendedData(base = {}, patch = {}) {
  const out = { ...base }
  for (const [key, val] of Object.entries(patch)) {
    if (
      val != null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      out[key] != null &&
      typeof out[key] === 'object' &&
      !Array.isArray(out[key])
    ) {
      out[key] = { ...out[key], ...val }
    } else {
      out[key] = val
    }
  }
  return out
}

/** Normalize checkpoint list from API (array or nested extendedData). */
export function normalizeCheckpoints(delivery) {
  const raw = delivery?.checkpoints ?? delivery?.extendedData?.checkpoints
  if (Array.isArray(raw)) return raw
  return []
}
