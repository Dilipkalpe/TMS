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
  if (filters.status) q.status = filters.status
  if (filters.vehicle) q.vehicle = filters.vehicle
  if (filters.hubBranchId) q.hubBranchId = filters.hubBranchId
  if (filters.workflow) q.workflow = filters.workflow
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
    status: '',
    vehicle: '',
    hubBranchId: '',
    workflow: '',
  }
}

/** booking = Booking→LR · direct = LR without booking */
export const WORKFLOW_OPTIONS = [
  { value: 'booking', label: 'Booking → LR' },
  { value: 'direct', label: 'Direct LR' },
]

/** Common LR flow statuses for report filters */
export const LR_REPORT_STATUSES = [
  'Draft',
  'LR Created',
  'Loading Completed',
  'Transit Pass Generated',
  'In Transit',
  'Hub Received',
  'Available for Re-Manifest',
  'Delivery Completed',
  'POD Uploaded',
  'Invoice Generated',
  'Closed',
]

export const HUB_MANIFEST_STATUSES = [
  'Draft',
  'VehicleAssigned',
  'ReadyForDispatch',
  'Dispatched',
  'Completed',
  'Cancelled',
]

export const DELIVERY_POD_STATUSES = [
  'Delivery Completed',
  'POD Uploaded',
  'Invoice Generated',
  'Closed',
]
