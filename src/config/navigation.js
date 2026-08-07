export const navigation = [
  { title: 'Dashboard', path: '/', icon: 'LayoutDashboard', feature: 'dashboard' },
  { title: 'Booking', path: '/bookings', icon: 'CalendarPlus', feature: 'booking' },
  {
    title: 'LR / Consignment',
    icon: 'FileText',
    feature: 'lr',
    children: [
      { title: 'LR Management', path: '/lr' },
      { title: 'Create LR', path: '/lr/generate' },
      { title: 'Expense Approval', path: '/lr/expense-approval' },
    ],
  },
  { title: 'Loading Slip', path: '/lr?status=loading-pending', icon: 'ClipboardList', feature: 'lr' },
  { title: 'Transit Pass', path: '/lr?status=transit-pass-generated', icon: 'FileBadge', feature: 'lr' },
  { title: 'In Transit', path: '/lr?status=dispatched', icon: 'Truck', feature: 'lr' },
  { title: 'Delivery / POD', path: '/lr?status=delivered', icon: 'PackageCheck', feature: 'lr' },
  { title: 'Billing', path: '/accounting', icon: 'Receipt', feature: 'accounting' },
  { title: 'Trip Expenses', path: '/lr?status=expense-pending', icon: 'Wallet' },
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
