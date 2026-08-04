/** Operational LR workflow tabs — LR Management navigation (maps to backend queue stages). */
export const LR_LIST_TAB = {
  id: 'lr-list',
  label: 'LR List',
  stage: 'lr-list',
  icon: 'List',
  processStep: null,
  masterView: true,
}

export const LR_OPERATION_FLOW = [
  { id: 'lr-created', label: 'LR Created', stage: 'lr-created', icon: 'FilePlus', processStep: 'loading' },
  { id: 'loading-pending', label: 'Loading Pending', stage: 'loading-pending', icon: 'Clock', processStep: 'loading', batchLoading: true },
  { id: 'loading-completed', label: 'Loading Completed', stage: 'loading-completed', icon: 'PackageCheck', processStep: 'loading' },
  { id: 'vehicle-assigned', label: 'Vehicle Assigned', stage: 'vehicle-assigned', icon: 'Truck', processStep: 'loading' },
  { id: 'transit-pass-generated', label: 'Transit Pass Generated', stage: 'transit-pass-generated', icon: 'FileText', processStep: 'transit' },
  { id: 'dispatched', label: 'Dispatched', stage: 'dispatched', icon: 'Send', processStep: 'delivery' },
  { id: 'delivered', label: 'Delivered', stage: 'delivered', icon: 'PackageCheck', processStep: 'delivery' },
  { id: 'pod-uploaded', label: 'POD Uploaded', stage: 'pod-uploaded', icon: 'Upload', processStep: 'delivery' },
  { id: 'invoice-generated', label: 'Invoice Generated', stage: 'invoice-generated', icon: 'Receipt', processStep: 'invoice' },
  { id: 'expense-pending', label: 'Expense Pending', stage: 'expense-pending', icon: 'Wallet', processStep: 'expense' },
  { id: 'expense-approved', label: 'Expense Approved', stage: 'expense-approved', icon: 'BadgeCheck', processStep: 'close' },
  { id: 'lr-closed', label: 'LR Closed', stage: 'closed', icon: 'CheckCircle2', processStep: null },
]

/** All tabs including master LR List (13 tabs). */
export const LR_MANAGEMENT_TABS = [LR_LIST_TAB, ...LR_OPERATION_FLOW]

/** KPI cards above tabs — maps summary API fields to tab stages. */
export const LR_KPI_CARDS = [
  { id: 'total', label: 'Total LR', field: 'totalLR', icon: 'Layers', color: 'violet', stage: 'lr-list' },
  { id: 'today', label: "Today's LR", field: 'todaysLR', icon: 'Calendar', color: 'blue', stage: 'lr-list' },
  { id: 'loading', label: 'Pending Loading', field: 'pendingLoading', icon: 'Clock', color: 'amber', stage: 'loading-pending' },
  { id: 'transit', label: 'In Transit', field: 'inTransit', icon: 'Truck', color: 'orange', stage: 'dispatched' },
  { id: 'delivered', label: 'Delivered', field: 'delivered', icon: 'PackageCheck', color: 'green', stage: 'delivered' },
  { id: 'pod', label: 'Pending POD', field: 'pendingPOD', icon: 'Upload', color: 'red', stage: 'delivered' },
  { id: 'invoice', label: 'Pending Invoice', field: 'pendingInvoice', icon: 'Receipt', color: 'amber', stage: 'pod-uploaded' },
  { id: 'expense', label: 'Pending Expense', field: 'pendingExpense', icon: 'Wallet', color: 'orange', stage: 'expense-pending' },
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

/** Detail page timeline stages. */
export const LR_DETAIL_TIMELINE = [
  { key: 'LR Created', label: 'LR Created', section: 'info' },
  { key: 'Loading Completed', label: 'Loading', section: 'loading' },
  { key: 'Loading Completed', label: 'Vehicle Assigned', section: 'vehicle', matchVehicle: true },
  { key: 'Transit Pass Generated', label: 'Transit Pass', section: 'transit' },
  { key: 'In Transit', label: 'Dispatch', section: 'dispatch' },
  { key: 'Delivery Completed', label: 'Delivery', section: 'delivery' },
  { key: 'POD Uploaded', label: 'POD', section: 'pod' },
  { key: 'Invoice Generated', label: 'Invoice', section: 'invoice' },
  { key: 'Expense Added', label: 'Expense', section: 'expenses' },
  { key: 'Closed', label: 'Closed', section: 'info' },
]

export function getFlowStep(idOrStage) {
  if (idOrStage === 'lr-list') return LR_LIST_TAB
  return LR_OPERATION_FLOW.find((s) => s.id === idOrStage || s.stage === idOrStage)
}

export function getManagementTab(idOrStage) {
  return LR_MANAGEMENT_TABS.find((s) => s.id === idOrStage || s.stage === idOrStage) ?? LR_LIST_TAB
}

export function getDetailSection(id) {
  return LR_DETAIL_SECTIONS.find((s) => s.id === id)
}

export function stageLabelForStatus(status) {
  const stage = defaultFlowStageForStatus(status)
  return getFlowStep(stage)?.label ?? status
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

const ADMIN_ROLES = new Set(['Admin', 'Super Admin', 'Platform Super Admin'])

export function canApproveLrExpense(role) {
  return ADMIN_ROLES.has(role)
}

export function canCancelLr(role) {
  return ADMIN_ROLES.has(role)
}

export function canCloseLr(role) {
  return ADMIN_ROLES.has(role)
}

/** Status-based row actions for grid Action column. */
export function lrRowActions(status, role = '') {
  const actions = [{ id: 'view', label: 'View' }]
  if (status === 'Draft' || status === 'LR Created') {
    actions.push({ id: 'edit', label: 'Edit' })
  } else if (status !== 'Closed') {
    actions.push({ id: 'edit', label: 'Edit', variant: 'outline' })
  }

  const add = (id, label) => actions.push({ id, label, primary: true })

  switch (status) {
    case 'Draft':
    case 'LR Created':
      add('assign-vehicle', 'Assign Vehicle')
      break
    case 'Loading Completed':
      add('assign-vehicle', 'Assign Vehicle')
      add('transit-pass', 'Generate Transit Pass')
      break
    case 'Transit Pass Generated':
      add('transit-pass', 'Generate Transit Pass')
      break
    case 'In Transit':
      add('dispatch', 'Dispatch')
      break
    case 'Delivery Completed':
      add('pod', 'Upload POD')
      break
    case 'POD Uploaded':
      add('invoice', 'Generate Invoice')
      break
    case 'Invoice Generated':
    case 'Expense Added':
      add('expense', 'Add Expense')
      if (canApproveLrExpense(role)) add('approve-expense', 'Approve Expense')
      break
    case 'Expense Approved':
      if (canCloseLr(role)) add('close', 'Close LR')
      break
    default:
      break
  }

  if (canCancelLr(role) && status !== 'Closed') {
    actions.push({ id: 'cancel', label: 'Cancel LR', danger: true })
  }

  return actions
}

export function lrActionPath(lrNumber, actionId, processStep) {
  const base = `/lr/${encodeURIComponent(String(lrNumber).replaceAll('/', '~'))}`
  switch (actionId) {
    case 'view': return base
    case 'edit': return `${base}/edit`
    case 'assign-vehicle':
    case 'transit-pass':
    case 'dispatch':
    case 'pod':
    case 'invoice':
    case 'expense':
    case 'close':
      return `${base}/process${processStep ? `?step=${encodeURIComponent(processStep)}` : ''}`
    case 'approve-expense': return '/lr/expense-approval'
    default: return base
  }
}
