import LrOperationQueuePage from './LrOperationQueuePage'

export function LrManagementQueue() {
  return <LrOperationQueuePage stage="lr-management" />
}

export function LoadingManagementQueue() {
  return <LrOperationQueuePage stage="loading" />
}

export function TransitPassQueue() {
  return <LrOperationQueuePage stage="transit-pass" />
}

export function DeliveryManagementQueue() {
  return <LrOperationQueuePage stage="delivery" />
}

export function InvoiceManagementQueue() {
  return <LrOperationQueuePage stage="invoice" />
}

export function LrExpenseManagementQueue() {
  return <LrOperationQueuePage stage="expense" />
}

export function LrClosingQueue() {
  return <LrOperationQueuePage stage="closing" />
}
