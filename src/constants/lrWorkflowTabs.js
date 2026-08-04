/** LR Management workflow tabs — operation-based queues inside /lr */
export const LR_WORKFLOW_TABS = [
  { id: 'lr-list', label: 'LR List', path: '/lr', stage: 'lr-list', processStep: null },
  { id: 'loading-pending', label: 'Loading Pending', path: '/lr/loading-pending', stage: 'loading-pending', processStep: 'loading' },
  { id: 'loading-sheet', label: 'Loading Sheet', path: '/lr/loading-sheet', stage: 'loading-sheet', processStep: 'loading', batchLoading: true },
  { id: 'transit-pass', label: 'Transit Pass', path: '/lr/transit-pass', stage: 'transit-pass', processStep: 'transit' },
  { id: 'dispatch', label: 'Dispatch', path: '/lr/dispatch', stage: 'dispatch', processStep: 'delivery' },
  { id: 'delivery', label: 'Delivery', path: '/lr/delivery', stage: 'delivery', processStep: 'delivery' },
  { id: 'pod-pending', label: 'POD Pending', path: '/lr/pod-pending', stage: 'pod-pending', processStep: 'delivery' },
  { id: 'invoice-pending', label: 'Invoice Pending', path: '/lr/invoice-pending', stage: 'invoice-pending', processStep: 'invoice' },
  { id: 'expense-pending', label: 'Expense Pending', path: '/lr/expense-pending', stage: 'expense-pending', processStep: 'expense' },
  { id: 'closed', label: 'Closed LR', path: '/lr/closed', stage: 'closed', processStep: null },
]

export function getWorkflowTab(stageOrPath) {
  return LR_WORKFLOW_TABS.find(
    (t) => t.stage === stageOrPath || t.id === stageOrPath || t.path === stageOrPath,
  )
}

export function resolveWorkflowStage(pathname) {
  const tab = LR_WORKFLOW_TABS.find((t) => t.path === pathname || (t.path !== '/lr' && pathname.startsWith(t.path)))
  if (tab) return tab.stage
  if (pathname === '/lr' || pathname.startsWith('/lr?')) return 'lr-list'
  return 'lr-list'
}

/** @deprecated use LR_WORKFLOW_TABS — kept for /operations redirects */
export const LR_OPERATION_MENUS = LR_WORKFLOW_TABS.filter((t) => t.id !== 'lr-list' && t.id !== 'closed').map((t) => ({
  id: t.id,
  title: t.label,
  description: `Pending ${t.label.toLowerCase()}`,
  path: t.path.replace('/lr/', '/operations/').replace('/lr', '/operations/lr-management'),
  icon: 'FileText',
  stage: t.stage,
  processStep: t.processStep,
}))

export function getOperationMenu(stageOrId) {
  return getWorkflowTab(stageOrId) || LR_OPERATION_MENUS.find((m) => m.stage === stageOrId || m.id === stageOrId)
}
