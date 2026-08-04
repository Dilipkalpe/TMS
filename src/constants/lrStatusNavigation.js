/** Operational LR status flow — clickable navigation in LR Management (maps to backend queue stages). */
export const LR_OPERATION_FLOW = [
  { id: 'lr-created', label: 'LR Created', stage: 'lr-created', processStep: 'loading' },
  { id: 'loading-pending', label: 'Loading Pending', stage: 'loading-pending', processStep: 'loading', batchLoading: true },
  { id: 'loading-completed', label: 'Loading Completed', stage: 'loading-completed', processStep: 'loading' },
  { id: 'vehicle-assigned', label: 'Vehicle Assigned', stage: 'vehicle-assigned', processStep: 'loading' },
  { id: 'transit-pass-generated', label: 'Transit Pass Generated', stage: 'transit-pass-generated', processStep: 'transit' },
  { id: 'dispatched', label: 'Dispatched', stage: 'dispatched', processStep: 'delivery' },
  { id: 'delivered', label: 'Delivered', stage: 'delivered', processStep: 'delivery' },
  { id: 'pod-uploaded', label: 'POD Uploaded', stage: 'pod-uploaded', processStep: 'delivery' },
  { id: 'invoice-generated', label: 'Invoice Generated', stage: 'invoice-generated', processStep: 'invoice' },
  { id: 'expense-pending', label: 'Expense Pending', stage: 'expense-pending', processStep: 'expense' },
  { id: 'expense-approved', label: 'Expense Approved', stage: 'expense-approved', processStep: 'close' },
  { id: 'lr-closed', label: 'LR Closed', stage: 'closed', processStep: null },
]

export const LR_DETAIL_SECTIONS = [
  { id: 'info', label: 'LR Information' },
  { id: 'parties', label: 'Consignor / Consignee' },
  { id: 'loading', label: 'Loading Details', processStep: 'loading' },
  { id: 'vehicle', label: 'Vehicle Assignment', processStep: 'loading' },
  { id: 'transit', label: 'Transit Pass', processStep: 'transit' },
  { id: 'dispatch', label: 'Dispatch Details', processStep: 'delivery' },
  { id: 'delivery', label: 'Delivery Details', processStep: 'delivery' },
  { id: 'pod', label: 'POD Upload', processStep: 'delivery' },
  { id: 'invoice', label: 'Invoice Details', processStep: 'invoice' },
  { id: 'expenses', label: 'LR Expenses & Approval', processStep: 'expense' },
]

export function getFlowStep(idOrStage) {
  return LR_OPERATION_FLOW.find((s) => s.id === idOrStage || s.stage === idOrStage)
}

export function getDetailSection(id) {
  return LR_DETAIL_SECTIONS.find((s) => s.id === id)
}

/** Default detail section when opening an LR from the grid. */
export function defaultDetailSectionForStatus(status) {
  const map = {
    Draft: 'info',
    'LR Created': 'loading',
    'Loading Completed': 'transit',
    'Transit Pass Generated': 'dispatch',
    'In Transit': 'delivery',
    'Delivery Completed': 'pod',
    'POD Uploaded': 'invoice',
    'Invoice Generated': 'expenses',
    'Expense Added': 'expenses',
    'Expense Approved': 'expenses',
    Closed: 'info',
  }
  return map[status] ?? 'info'
}

export function defaultFlowStageForStatus(status) {
  const map = {
    Draft: 'lr-created',
    'LR Created': 'loading-pending',
    'Loading Completed': 'vehicle-assigned',
    'Transit Pass Generated': 'dispatched',
    'In Transit': 'delivered',
    'Delivery Completed': 'pod-uploaded',
    'POD Uploaded': 'invoice-generated',
    'Invoice Generated': 'expense-pending',
    'Expense Added': 'expense-pending',
    'Expense Approved': 'expense-approved',
    Closed: 'lr-closed',
  }
  return map[status] ?? 'lr-created'
}

/** Stage-specific grid action label (overrides generic status action when filtering). */
export function gridActionForStage(stage) {
  const step = getFlowStep(stage)
  if (!step) return 'Continue'
  const labels = {
    'lr-created': 'Create Loading',
    'loading-pending': 'Create Loading Sheet',
    'loading-completed': 'Assign Vehicle',
    'vehicle-assigned': 'Generate Transit Pass',
    'transit-pass-generated': 'Dispatch Vehicle',
    dispatched: 'Confirm Delivery',
    delivered: 'Upload POD',
    'pod-uploaded': 'Generate Invoice',
    'invoice-generated': 'Add Expense',
    'expense-pending': 'Approve Expense',
    'expense-approved': 'Close LR',
    closed: 'View LR',
  }
  return labels[step.stage] ?? 'Continue'
}
