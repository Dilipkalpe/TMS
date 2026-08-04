/** LR lifecycle steps — must match backend LrStatuses.All */
export const LR_STATUS_STEPS = [
  'Draft',
  'LR Created',
  'Loading Completed',
  'Transit Pass Generated',
  'In Transit',
  'Delivery Completed',
  'POD Uploaded',
  'Invoice Generated',
  'Expense Added',
  'Expense Approved',
  'Closed',
]

export function lrStatusStepIndex(status) {
  const normalized = status?.trim() || 'LR Created'
  const idx = LR_STATUS_STEPS.indexOf(normalized)
  return idx >= 0 ? idx : LR_STATUS_STEPS.indexOf('LR Created')
}

export function lrStatusProgress(status) {
  const idx = lrStatusStepIndex(status)
  return Math.round(((idx + 1) / LR_STATUS_STEPS.length) * 100)
}
