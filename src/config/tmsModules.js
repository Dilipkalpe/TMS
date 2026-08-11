/** TMS module registry — List + Add/Edit routes per business flow (LR master → child transactions). */
export const TMS_MODULES = {
  lr: {
    id: 'lr',
    title: 'LR / Consignment',
    listPath: '/lr/list',
    addPath: '/lr/entry',
    bulkAddPath: '/lr/bulk',
    remark: 'Master shipment document for the transport lifecycle.',
  },
  loadingSlip: {
    id: 'loading-slip',
    title: 'Loading Slip',
    listPath: '/operations/loading-slip/list',
    addPath: '/operations/loading-slip',
    summaryKey: 'loading-slips',
    listKey: 'loading-slips',
    remark: 'Warehouse loading instructions referencing assigned LR(s).',
  },
  transitPass: {
    id: 'transit-pass',
    title: 'Transit Pass',
    listPath: '/operations/transit-pass/list',
    addPath: '/operations/transit-pass',
    summaryKey: 'transit-passes',
    listKey: 'transit-passes',
    remark: 'Travel documents linked to vehicle, trip, and LR(s).',
  },
  dispatch: {
    id: 'dispatch',
    title: 'Dispatch',
    listPath: '/operations/dispatch/list',
    addPath: '/operations/dispatch',
    summaryKey: 'dispatch',
    listKey: 'dispatch',
    remark: 'Confirm vehicle gate-out and dispatch from transit pass.',
  },
  inTransit: {
    id: 'in-transit',
    title: 'In Transit',
    listPath: '/operations/in-transit/list',
    addPath: '/operations/in-transit',
    summaryKey: 'in-transit',
    listKey: 'in-transit',
    remark: 'Track active trips, checkpoints, and location updates.',
  },
  deliveryComplete: {
    id: 'delivery-complete',
    title: 'Delivery Complete',
    listPath: '/operations/delivery-complete/list',
    addPath: '/operations/delivery-complete',
    summaryKey: 'delivery-complete',
    listKey: 'delivery-complete',
    remark: 'Confirm successful shipment delivery at destination.',
  },
  pod: {
    id: 'pod',
    title: 'POD (Proof of Delivery)',
    listPath: '/operations/delivery/pod/list',
    addPath: '/operations/delivery/pod',
    summaryKey: 'pod',
    listKey: 'pod',
    remark: 'Customer signature, photo, and delivery confirmation linked to LR.',
  },
  billing: {
    id: 'billing',
    title: 'Billing / Invoice',
    listPath: '/operations/billing/list',
    addPath: '/operations/billing/invoice',
    summaryKey: 'billing',
    listKey: 'billing',
    remark: 'Freight invoices from LR details; POD validation before invoicing.',
  },
  tripExpenses: {
    id: 'trip-expenses',
    title: 'Trip Expenses',
    listPath: '/operations/trip-expenses/list',
    addPath: '/operations/trip-expenses',
    summaryKey: 'trip-expenses',
    listKey: 'trip-expenses',
    remark: 'Trip expenses (diesel, toll, allowance) linked to LR/trip — independent of billing.',
  },
}

export const LOADING_SLIP_COLUMNS = [
  { key: 'sheetNumber', label: 'Loading Slip No.' },
  { key: 'loadingDate', label: 'Loading Date', render: (r) => r.loadingDate?.slice?.(0, 16)?.replace('T', ' ') ?? r.loadingDate },
  { key: 'lrNumber', label: 'LR No.' },
  { key: 'vehicleNumber', label: 'Vehicle No.' },
  { key: 'driver', label: 'Driver' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'lrCount', label: 'Total LR' },
  { key: 'loadingStatus', label: 'Loading Status', badge: true },
  { key: 'verifiedStatus', label: 'Verified', badge: true },
  { key: 'createdBy', label: 'Created By' },
]

export const TRANSIT_PASS_COLUMNS = [
  { key: 'passNumber', label: 'Transit Pass No.' },
  { key: 'passDate', label: 'Pass Date' },
  { key: 'lrNumber', label: 'LR No.' },
  { key: 'fromBranch', label: 'From' },
  { key: 'toBranch', label: 'Destination' },
  { key: 'vehicleNumber', label: 'Vehicle No.' },
  { key: 'driver', label: 'Driver' },
  { key: 'status', label: 'Status', badge: true },
  { key: 'createdBy', label: 'Created By' },
]

export const DISPATCH_COLUMNS = [
  { key: 'transitPassNo', label: 'Transit Pass No.' },
  { key: 'lrNumber', label: 'LR No.' },
  { key: 'dispatchDate', label: 'Date' },
  { key: 'vehicleNumber', label: 'Vehicle' },
  { key: 'driver', label: 'Driver' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'Destination' },
  { key: 'status', label: 'Status', badge: true },
]

export const IN_TRANSIT_COLUMNS = [
  { key: 'tripNo', label: 'Trip / Dispatch No.' },
  { key: 'transitPassNo', label: 'Transit Pass' },
  { key: 'lrNumber', label: 'LR No.' },
  { key: 'vehicleNumber', label: 'Vehicle' },
  { key: 'driver', label: 'Driver' },
  { key: 'from', label: 'Origin' },
  { key: 'to', label: 'Destination' },
  { key: 'dispatchTime', label: 'Dispatch Time' },
  { key: 'status', label: 'Status', badge: true },
]

export const DELIVERY_COLUMNS = [
  { key: 'lrNumber', label: 'LR No.' },
  { key: 'tripNo', label: 'Trip No.' },
  { key: 'customer', label: 'Customer' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'deliveryDate', label: 'Delivery Date' },
  { key: 'receiverName', label: 'Receiver' },
  { key: 'deliveryStatus', label: 'Delivery Status', badge: true },
  { key: 'podStatus', label: 'POD Status', badge: true },
]

export const POD_COLUMNS = [
  { key: 'podNo', label: 'POD No.' },
  { key: 'lrNumber', label: 'LR No.' },
  { key: 'customer', label: 'Customer' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'deliveryDate', label: 'Delivery Date' },
  { key: 'receiverName', label: 'Receiver' },
  { key: 'podStatus', label: 'POD Status', badge: true },
  { key: 'verificationStatus', label: 'Verification', badge: true },
  { key: 'receivedBy', label: 'Received By' },
]

export const BILLING_COLUMNS = [
  { key: 'invoiceNo', label: 'Invoice No.' },
  { key: 'invoiceDate', label: 'Invoice Date' },
  { key: 'lrNumber', label: 'LR No.' },
  { key: 'customer', label: 'Customer' },
  { key: 'freight', label: 'Freight (₹)', money: true },
  { key: 'gst', label: 'GST (₹)', money: true },
  { key: 'totalAmount', label: 'Total (₹)', money: true },
  { key: 'outstanding', label: 'Outstanding (₹)', money: true },
  { key: 'paymentStatus', label: 'Payment', badge: true },
]

export const EXPENSE_COLUMNS = [
  { key: 'expenseDate', label: 'Expense Date' },
  { key: 'lrNumber', label: 'LR No.' },
  { key: 'tripNo', label: 'Trip / Vehicle' },
  { key: 'driver', label: 'Driver' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'expenseType', label: 'Expense Type', badge: true },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount (₹)', money: true },
  { key: 'status', label: 'Status', badge: true },
]

export const MODULE_COLUMN_MAP = {
  'loading-slips': LOADING_SLIP_COLUMNS,
  'transit-passes': TRANSIT_PASS_COLUMNS,
  dispatch: DISPATCH_COLUMNS,
  'in-transit': IN_TRANSIT_COLUMNS,
  'delivery-complete': DELIVERY_COLUMNS,
  pod: POD_COLUMNS,
  billing: BILLING_COLUMNS,
  'trip-expenses': EXPENSE_COLUMNS,
}

export const MODULE_KPI_MAP = {
  'loading-slips': [
    { field: 'total', label: 'Total Loading Slip', color: 'blue' },
    { field: 'pending', label: 'Pending Loading', color: 'orange' },
    { field: 'loaded', label: 'Loaded', color: 'green' },
    { field: 'inTransit', label: 'In Transit', color: 'violet' },
    { field: 'today', label: "Today's Loading", color: 'cyan' },
  ],
  'transit-passes': [
    { field: 'total', label: 'Total Transit Pass', color: 'blue' },
    { field: 'active', label: 'Active', color: 'orange' },
    { field: 'completed', label: 'Completed', color: 'green' },
    { field: 'cancelled', label: 'Cancelled', color: 'violet' },
    { field: 'today', label: "Today's Pass", color: 'cyan' },
  ],
  dispatch: [
    { field: 'total', label: 'Total', color: 'blue' },
    { field: 'pending', label: 'Pending Dispatch', color: 'orange' },
    { field: 'todayDispatched', label: 'Today Dispatched', color: 'green' },
    { field: 'inTransit', label: 'In Transit', color: 'violet' },
    { field: 'cancelled', label: 'Cancelled', color: 'red' },
  ],
  'in-transit': [
    { field: 'total', label: 'Active Trips', color: 'blue' },
    { field: 'dispatched', label: 'Dispatched', color: 'orange' },
    { field: 'delayed', label: 'Delayed', color: 'red' },
    { field: 'atDestination', label: 'At Destination', color: 'green' },
    { field: 'today', label: "Today's Updates", color: 'cyan' },
  ],
  'delivery-complete': [
    { field: 'total', label: 'Total Deliveries', color: 'blue' },
    { field: 'pendingDelivery', label: 'Ready for Delivery', color: 'orange' },
    { field: 'today', label: "Today's Deliveries", color: 'green' },
    { field: 'thisMonth', label: 'This Month', color: 'violet' },
    { field: 'pendingPod', label: 'Pending POD', color: 'cyan' },
  ],
  pod: [
    { field: 'total', label: 'Total POD', color: 'blue' },
    { field: 'received', label: 'POD Received', color: 'green' },
    { field: 'pending', label: 'POD Pending', color: 'orange' },
    { field: 'verified', label: 'POD Verified', color: 'violet' },
    { field: 'today', label: "Today's POD", color: 'cyan' },
  ],
  billing: [
    { field: 'total', label: 'Total Bills', color: 'blue' },
    { field: 'pending', label: 'Pending Bills', color: 'orange' },
    { field: 'paid', label: 'Paid Bills', color: 'green' },
    { field: 'outstanding', label: 'Outstanding (₹)', color: 'red', money: true },
    { field: 'todayAmount', label: "Today's Billing", color: 'cyan', money: true },
  ],
  'trip-expenses': [
    { field: 'totalAmount', label: 'Total Expenses', color: 'blue', money: true },
    { field: 'fuel', label: 'Fuel', color: 'orange', money: true },
    { field: 'toll', label: 'Toll', color: 'green', money: true },
    { field: 'maintenance', label: 'Maintenance', color: 'violet', money: true },
    { field: 'other', label: 'Other', color: 'cyan', money: true },
  ],
}
