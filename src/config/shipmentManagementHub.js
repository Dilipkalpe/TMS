import { withHubTheme } from './hubTheme'

export const shipmentManagementCards = withHubTheme([
  { title: 'Quotation', path: '/bookings/quotations', icon: 'FileSpreadsheet', description: 'Create and manage freight quotations', tone: 'violet', chip: 'Quote' },
  { title: 'Booking', path: '/bookings', icon: 'CalendarPlus', description: 'Booking management and confirmations', tone: 'blue', chip: 'Book' },
  { title: 'LR List', path: '/lr/list', icon: 'FileText', description: 'Lorry receipts and consignment register', tone: 'indigo', chip: 'LR' },
  { title: 'Loading Slip', path: '/operations/loading-slip/list', icon: 'ClipboardList', description: 'Create and manage loading slips', tone: 'teal', chip: 'Load' },
  { title: 'Transit Pass', path: '/operations/transit-pass/list', icon: 'FileBadge', description: 'Issue transit passes for loaded consignments', tone: 'amber', chip: 'Pass' },
  { title: 'Dispatch', path: '/operations/dispatch/list', icon: 'Send', description: 'Dispatch vehicles and mark LRs out', tone: 'rose', chip: 'Out' },
  { title: 'Hub Transfer', path: '/shipment-management/hub-transfer', icon: 'GitBranch', description: 'Hub receive, unload, re-manifest and dispatch', tone: 'cyan', chip: 'Hub' },
])
