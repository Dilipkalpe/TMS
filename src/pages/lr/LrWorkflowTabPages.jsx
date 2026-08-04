import LrWorkflowGrid from './LrWorkflowGrid'
import LoadingSheetBatchPage from './LoadingSheetBatchPage'

export function LrListTab() {
  return <LrWorkflowGrid stage="lr-list" />
}

export function LrLoadingPendingTab() {
  return <LrWorkflowGrid stage="loading-pending" />
}

export function LrLoadingSheetTab() {
  return <LoadingSheetBatchPage />
}

export function LrTransitPassTab() {
  return <LrWorkflowGrid stage="transit-pass" />
}

export function LrDispatchTab() {
  return <LrWorkflowGrid stage="dispatch" />
}

export function LrDeliveryTab() {
  return <LrWorkflowGrid stage="delivery" />
}

export function LrPodPendingTab() {
  return <LrWorkflowGrid stage="pod-pending" />
}

export function LrInvoicePendingTab() {
  return <LrWorkflowGrid stage="invoice-pending" />
}

export function LrExpensePendingTab() {
  return <LrWorkflowGrid stage="expense-pending" />
}

export function LrClosedTab() {
  return <LrWorkflowGrid stage="closed" />
}
