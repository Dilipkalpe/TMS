import { hubSection, withHubTheme } from './hubTheme'

export const reportCards = withHubTheme([
  { title: 'LR / Trip Register', path: '/reports/trips', icon: 'Route', description: 'All LRs — Booking→LR and Direct LR, with stage & profit' },
  { title: 'Loading & Dispatch', path: '/reports/loading-dispatch', icon: 'Package', description: 'Loading sheets and dispatch (both workflows)' },
  { title: 'Hub Transfer', path: '/reports/hub-transfer', icon: 'GitBranch', description: 'Hub manifests and transfer movements' },
  { title: 'Delivery & POD', path: '/reports/delivery-pod', icon: 'PackageCheck', description: 'Delivery complete and proof of delivery' },
  { title: 'Vehicle Report', path: '/reports/vehicles', icon: 'Truck', description: 'Live LR counts and freight by vehicle' },
  { title: 'Driver Report', path: '/reports/drivers', icon: 'UserCircle', description: 'Live LR counts and freight by driver' },
  { title: 'Customer Report', path: '/reports/customers', icon: 'Users', description: 'Consignor freight — booking & direct LR split' },
  { title: 'Vendor Report', path: '/reports/vendors', icon: 'Building2', description: 'Vendor bills from expenses' },
  { title: 'Booking P&L', path: '/reports/booking-pl', icon: 'PieChart', description: 'Profit & loss for Booking → LR workflow' },
  { title: 'Direct LR P&L', path: '/reports/direct-lr-pl', icon: 'FileSpreadsheet', description: 'Profit & loss for LRs created without booking' },
  { title: 'Broker Outstanding', path: '/reports/broker-outstanding', icon: 'Handshake', description: 'Pending broker charges (booking workflow)' },
  { title: 'Income Report', path: '/reports/income', icon: 'TrendingUp', description: 'LR freight by month — booking vs direct' },
  { title: 'Expense Report', path: '/reports/expenses', icon: 'TrendingDown', description: 'General, LR and booking expenses' },
  { title: 'Cash Flow', path: '/reports/cash-flow', icon: 'ArrowLeftRight', description: 'Monthly cash flow statement' },
  { title: 'Ledger Report', path: '/accounting/ledger-report', icon: 'BookOpen', description: 'Account-wise ledger transactions' },
  { title: 'Balance Sheet', path: '/accounting/balance-sheet', icon: 'Scale', description: 'Assets, liabilities and capital' },
  { title: 'Profit & Loss', path: '/accounting/profit-loss', icon: 'PieChart', description: 'Income and expense statement' },
  { title: 'Trial Balance', path: '/accounting/trial-balance', icon: 'Calculator', description: 'Debit and credit trial balance' },
])

const byPath = Object.fromEntries(reportCards.map((c) => [c.path, c]))
const pick = (...paths) => paths.map((p) => byPath[p]).filter(Boolean)

export const reportsHubSections = [
  hubSection('Operations reports', 'Booking→LR and Direct LR through delivery', pick(
    '/reports/trips',
    '/reports/loading-dispatch',
    '/reports/hub-transfer',
    '/reports/delivery-pod',
    '/reports/vehicles',
    '/reports/drivers',
    '/reports/customers',
    '/reports/vendors',
  ), { chip: 'Ops' }),
  hubSection('Finance reports', 'Workflow P&L, income, expense, and statements', pick(
    '/reports/booking-pl',
    '/reports/direct-lr-pl',
    '/reports/broker-outstanding',
    '/reports/income',
    '/reports/expenses',
    '/reports/cash-flow',
    '/accounting/ledger-report',
    '/accounting/trial-balance',
    '/accounting/profit-loss',
    '/accounting/balance-sheet',
  ), { chip: 'Finance' }),
]
