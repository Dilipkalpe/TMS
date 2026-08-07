export const navigation = [
  { title: 'Dashboard', path: '/', icon: 'LayoutDashboard', feature: 'dashboard' },
  { title: 'Booking', path: '/bookings', icon: 'CalendarPlus', feature: 'booking' },
  {
    title: 'LR / Consignment',
    icon: 'FileText',
    feature: 'lr',
    children: [
      { title: 'LR List', path: '/lr/list' },
      { title: 'LR Entry (Fast)', path: '/lr/entry' },
      { title: 'Ultra LR Entry', path: '/lr/ultra-entry' },
      { title: 'LR Management', path: '/lr' },
      { title: 'Expense Approval', path: '/lr/expense-approval' },
    ],
  },
  {
    title: 'Loading Slip',
    icon: 'ClipboardList',
    feature: 'lr',
    children: [
      { title: 'Loading Slip List', path: '/operations/loading-slip/list' },
      { title: 'Create Loading Slip', path: '/operations/loading-slip' },
    ],
  },
  {
    title: 'Transit Pass',
    icon: 'FileBadge',
    feature: 'lr',
    children: [
      { title: 'Transit Pass List', path: '/operations/transit-pass/list' },
      { title: 'Create Transit Pass', path: '/operations/transit-pass' },
    ],
  },
  { title: 'In Transit', path: '/lr?status=dispatched', icon: 'Truck', feature: 'lr' },
  {
    title: 'Delivery / POD',
    icon: 'PackageCheck',
    feature: 'lr',
    children: [
      { title: 'Delivery Complete List', path: '/operations/delivery-complete/list' },
      { title: 'Delivery Complete', path: '/operations/delivery-complete' },
      { title: 'POD List', path: '/operations/delivery/pod/list' },
      { title: 'POD Entry', path: '/operations/delivery/pod' },
      { title: 'Delivery Queue', path: '/lr?status=delivered' },
    ],
  },
  {
    title: 'Billing',
    icon: 'Receipt',
    feature: 'accounting',
    children: [
      { title: 'Billing List', path: '/operations/billing/list' },
      { title: 'Create Invoice', path: '/operations/billing/invoice' },
      { title: 'Invoice Queue', path: '/lr?status=pod-uploaded' },
    ],
  },
  {
    title: 'Trip Expenses',
    icon: 'Wallet',
    children: [
      { title: 'Trip Expenses List', path: '/operations/trip-expenses/list' },
      { title: 'Add Trip Expenses', path: '/operations/trip-expenses' },
      { title: 'Expense Queue', path: '/lr?status=expense-pending' },
    ],
  },
  { title: 'Accounts', path: '/accounting', icon: 'Calculator', feature: 'accounting' },
  {
    title: 'Reports',
    path: '/reports',
    icon: 'BarChart3',
    feature: 'dashboard',
    children: [
      { title: 'Reports Hub', path: '/reports' },
      { title: 'Operations', path: '/operations' },
      { title: 'Analytics', path: '/operations/analytics' },
    ],
  },
  {
    title: 'Masters',
    icon: 'Database',
    children: [
      { title: 'Vehicles', path: '/vehicles' },
      { title: 'Customers', path: '/customers' },
      { title: 'Drivers / HR', path: '/hr/employees' },
      { title: 'Vendors', path: '/vendors' },
      { title: 'Consignors', path: '/consignors' },
      { title: 'Consignees', path: '/consignees' },
      { title: 'Freight Rates', path: '/freight-rates' },
    ],
  },
  { title: 'Maintenance', path: '/maintenance', icon: 'Wrench' },
  { title: 'Expenses', path: '/expenses', icon: 'Wallet' },
  { title: 'HR', path: '/hr', icon: 'Briefcase' },
  { title: 'Payroll', path: '/payroll', icon: 'Banknote' },
  { title: 'Admin', path: '/admin', icon: 'Shield' },
  { title: 'Settings', path: '/settings', icon: 'Settings' },
]

export const platformNavigation = [
  { title: 'Platform Admin', path: '/platform', icon: 'Shield' },
]
