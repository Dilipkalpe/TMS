/** @deprecated — use lrStatusNavigation.js */
export {
  LR_MANAGEMENT_TABS as LR_WORKFLOW_TABS,
  LR_OPERATION_FLOW,
  getFlowStep as getWorkflowTab,
  getManagementTab,
} from './lrStatusNavigation'

export const LR_OPERATION_MENUS = []

export function getOperationMenu() {
  return undefined
}
