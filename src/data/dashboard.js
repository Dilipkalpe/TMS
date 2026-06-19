export const monthlyRevenue = [
  { month: 'Jan', value: 32 },
  { month: 'Feb', value: 38 },
  { month: 'Mar', value: 35 },
  { month: 'Apr', value: 42 },
  { month: 'May', value: 48 },
  { month: 'Jun', value: 45 },
  { month: 'Jul', value: 52 },
  { month: 'Aug', value: 49 },
  { month: 'Sep', value: 55 },
  { month: 'Oct', value: 58 },
  { month: 'Nov', value: 54 },
  { month: 'Dec', value: 62 },
]

export const monthlyExpenses = [
  { month: 'Jan', value: 22 },
  { month: 'Feb', value: 25 },
  { month: 'Mar', value: 24 },
  { month: 'Apr', value: 28 },
  { month: 'May', value: 30 },
  { month: 'Jun', value: 29 },
  { month: 'Jul', value: 32 },
  { month: 'Aug', value: 31 },
  { month: 'Sep', value: 34 },
  { month: 'Oct', value: 35 },
  { month: 'Nov', value: 33 },
  { month: 'Dec', value: 36 },
]

export const tripAnalysis = [
  { label: 'Completed', value: 68, color: '#2563eb' },
  { label: 'In Transit', value: 22, color: '#0ea5e9' },
  { label: 'Pending', value: 10, color: '#94a3b8' },
]

export const vehicleUtilization = [
  { vehicle: 'MH-12-AB-1234', utilization: 92 },
  { vehicle: 'MH-14-CD-5678', utilization: 85 },
  { vehicle: 'GJ-01-EF-9012', utilization: 78 },
  { vehicle: 'DL-01-GH-3456', utilization: 71 },
  { vehicle: 'KA-05-IJ-7890', utilization: 65 },
]

export const expenseBreakdown = [
  { label: 'Fuel', value: 35, color: '#f59e0b' },
  { label: 'Salary', value: 28, color: '#2563eb' },
  { label: 'Toll', value: 12, color: '#8b5cf6' },
  { label: 'Maintenance', value: 15, color: '#10b981' },
  { label: 'Office', value: 10, color: '#64748b' },
]

export const weeklyBookings = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 18 },
  { label: 'Wed', value: 15 },
  { label: 'Thu', value: 22 },
  { label: 'Fri', value: 19 },
  { label: 'Sat', value: 8 },
  { label: 'Sun', value: 5 },
]

export const profitTrend = monthlyRevenue.map((r, i) => ({
  month: r.month,
  revenue: r.value,
  expense: monthlyExpenses[i].value,
  profit: r.value - monthlyExpenses[i].value,
}))

export const routePerformance = [
  { label: 'Mumbai-Pune', value: 85 },
  { label: 'Delhi-Jaipur', value: 72 },
  { label: 'Chennai-Bangalore', value: 68 },
  { label: 'Kolkata-Patna', value: 55 },
  { label: 'Ahmedabad-Surat', value: 48 },
]

export const driverPerformance = [
  { label: 'Rajesh K.', value: 142 },
  { label: 'Suresh P.', value: 118 },
  { label: 'Amit S.', value: 95 },
  { label: 'Vikram S.', value: 76 },
  { label: 'Ramesh Y.', value: 134 },
]

export const paymentMix = [
  { label: 'Paid', value: 58, color: '#10b981' },
  { label: 'Partial', value: 24, color: '#f59e0b' },
  { label: 'Unpaid', value: 18, color: '#ef4444' },
]

export const fleetStatus = [
  { label: 'Active', value: 42, color: '#2563eb' },
  { label: 'On Trip', value: 28, color: '#0ea5e9' },
  { label: 'Maintenance', value: 6, color: '#f59e0b' },
  { label: 'Idle', value: 4, color: '#94a3b8' },
]

export const dashboardStats = [
  { label: 'Total Vehicles', value: '48', change: '+2', icon: 'Truck', color: 'blue' },
  { label: 'Total Drivers', value: '62', change: '+3', icon: 'UserCircle', color: 'indigo' },
  { label: 'Total Customers', value: '156', change: '+8', icon: 'Users', color: 'violet' },
  { label: 'Total Trips', value: '1,284', change: '+42', icon: 'Route', color: 'cyan' },
  { label: 'Pending LR', value: '23', change: '-5', icon: 'FileText', color: 'amber' },
  { label: "Today's Bookings", value: '18', change: '+6', icon: 'CalendarPlus', color: 'emerald' },
  { label: 'Total Income', value: '₹42.8L', change: '+12%', icon: 'TrendingUp', color: 'green' },
  { label: 'Total Expenses', value: '₹28.4L', change: '+8%', icon: 'TrendingDown', color: 'red' },
  { label: 'Net Profit', value: '₹14.4L', change: '+18%', icon: 'IndianRupee', color: 'green' },
  { label: 'Cash Balance', value: '₹3.2L', change: '', icon: 'Banknote', color: 'slate' },
  { label: 'Bank Balance', value: '₹18.6L', change: '', icon: 'Landmark', color: 'blue' },
]

export const recentBookings = [
  { id: 'BK-1042', customer: 'Reliance Logistics', route: 'Mumbai → Pune', date: '2026-06-18', status: 'Confirmed', payment: 'Paid' },
  { id: 'BK-1041', customer: 'Tata Steel Ltd', route: 'Jamshedpur → Kolkata', date: '2026-06-18', status: 'In Transit', payment: 'Partial' },
  { id: 'BK-1040', customer: 'Adani Ports', route: 'Mundra → Ahmedabad', date: '2026-06-17', status: 'Delivered', payment: 'Paid' },
  { id: 'BK-1039', customer: 'Mahindra & Mahindra', route: 'Nashik → Mumbai', date: '2026-06-17', status: 'Pending', payment: 'Unpaid' },
  { id: 'BK-1038', customer: 'Asian Paints', route: 'Mumbai → Bangalore', date: '2026-06-16', status: 'Confirmed', payment: 'Paid' },
]

export const recentTrips = [
  { lr: 'LR-2026-0892', vehicle: 'MH-12-AB-1234', driver: 'Rajesh Kumar', from: 'Mumbai', to: 'Delhi', freight: '₹45,000' },
  { lr: 'LR-2026-0891', vehicle: 'MH-14-CD-5678', driver: 'Suresh Patel', from: 'Pune', to: 'Hyderabad', freight: '₹32,500' },
  { lr: 'LR-2026-0890', vehicle: 'GJ-01-EF-9012', driver: 'Amit Singh', from: 'Ahmedabad', to: 'Jaipur', freight: '₹28,000' },
]
