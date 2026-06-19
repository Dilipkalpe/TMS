export const tripReport = [
  { lr: 'LR-2026-0892', date: '2026-06-18', vehicle: 'MH-12-AB-1234', driver: 'Rajesh Kumar', route: 'Mumbai → Pune', distance: '148 km', freight: 28500, expense: 14350, profit: 14150 },
  { lr: 'LR-2026-0891', date: '2026-06-18', vehicle: 'MH-14-CD-5678', driver: 'Suresh Patel', route: 'Jamshedpur → Kolkata', distance: '285 km', freight: 52000, expense: 28500, profit: 23500 },
  { lr: 'LR-2026-0890', date: '2026-06-17', vehicle: 'GJ-01-EF-9012', driver: 'Amit Singh', route: 'Mundra → Ahmedabad', distance: '310 km', freight: 38000, expense: 18200, profit: 19800 },
]

export const incomeReport = [
  { month: 'January', freight: 320000, loading: 12000, other: 5000, total: 337000 },
  { month: 'February', freight: 380000, loading: 15000, other: 4000, total: 399000 },
  { month: 'March', freight: 350000, loading: 11000, other: 6000, total: 367000 },
  { month: 'April', freight: 420000, loading: 18000, other: 8000, total: 446000 },
  { month: 'May', freight: 480000, loading: 20000, other: 7000, total: 507000 },
  { month: 'June', freight: 450000, loading: 16000, other: 9000, total: 475000 },
]

export const expenseReport = [
  { month: 'January', fuel: 220000, salary: 520000, toll: 85000, maintenance: 95000, office: 35000, total: 955000 },
  { month: 'February', fuel: 250000, salary: 520000, toll: 92000, maintenance: 78000, office: 28000, total: 968000 },
  { month: 'March', fuel: 240000, salary: 520000, toll: 88000, maintenance: 105000, office: 32000, total: 985000 },
  { month: 'April', fuel: 280000, salary: 520000, toll: 95000, maintenance: 88000, office: 38000, total: 1021000 },
  { month: 'May', fuel: 300000, salary: 520000, toll: 102000, maintenance: 92000, office: 42000, total: 1056000 },
  { month: 'June', fuel: 290000, salary: 520000, toll: 98000, maintenance: 85000, office: 35000, total: 1028000 },
]

export const cashFlowReport = [
  { month: 'January', inflow: 337000, outflow: 955000, net: -618000 },
  { month: 'February', inflow: 399000, outflow: 968000, net: -569000 },
  { month: 'March', inflow: 367000, outflow: 985000, net: -618000 },
  { month: 'April', inflow: 446000, outflow: 1021000, net: -575000 },
  { month: 'May', inflow: 507000, outflow: 1056000, net: -549000 },
  { month: 'June', inflow: 475000, outflow: 1028000, net: -553000 },
]

export const reportCards = [
  { title: 'Trip Report', path: '/reports/trips', icon: 'Route', description: 'Trip-wise freight, expense & profit analysis' },
  { title: 'Vehicle Report', path: '/reports/vehicles', icon: 'Truck', description: 'Vehicle utilization and performance' },
  { title: 'Driver Report', path: '/reports/drivers', icon: 'UserCircle', description: 'Driver trips, salary and advances' },
  { title: 'Income Report', path: '/reports/income', icon: 'TrendingUp', description: 'Monthly income breakdown' },
  { title: 'Expense Report', path: '/reports/expenses', icon: 'TrendingDown', description: 'Category-wise expense analysis' },
  { title: 'Customer Report', path: '/reports/customers', icon: 'Users', description: 'Customer trips and outstanding' },
  { title: 'Vendor Report', path: '/reports/vendors', icon: 'Building2', description: 'Vendor bills and payments' },
  { title: 'Ledger Report', path: '/accounting/ledger-report', icon: 'BookOpen', description: 'Account-wise ledger transactions' },
  { title: 'Cash Flow', path: '/reports/cash-flow', icon: 'ArrowLeftRight', description: 'Monthly cash flow statement' },
  { title: 'Balance Sheet', path: '/accounting/balance-sheet', icon: 'Scale', description: 'Assets, liabilities and capital' },
  { title: 'Profit & Loss', path: '/accounting/profit-loss', icon: 'PieChart', description: 'Income and expense statement' },
  { title: 'Trial Balance', path: '/accounting/trial-balance', icon: 'Calculator', description: 'Debit and credit trial balance' },
]
