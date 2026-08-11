export const operationsCards = [
  { title: 'Customer Portal', path: '/operations/customer-portal', icon: 'UserCircle', description: 'Customer bookings, tracking, invoices & POD' },
  { title: 'Shipments', path: '/operations/shipments', icon: 'Package', description: 'Freight shipments search & live tracking' },
  { title: 'Trips', path: '/operations/trips', icon: 'Truck', description: 'Create trips, start/complete status for routing' },
  { title: 'GPS Tracking', path: '/operations/gps', icon: 'MapPin', description: 'Live fleet map, history & geofencing' },
  { title: 'Fuel Management', path: '/operations/fuel', icon: 'Gauge', description: 'Fuel entries, analytics & theft alerts' },
  { title: 'Route Optimizer', path: '/operations/routing', icon: 'Route', description: 'Stop sequencing, ETA & fuel estimates' },
  { title: 'Finance', path: '/operations/finance', icon: 'Wallet', description: 'Ops revenue summary, invoices & expenses' },
  { title: 'Predictive Maintenance', path: '/maintenance', icon: 'Wrench', description: 'Service schedules & breakdown risk' },
  { title: 'Documents', path: '/operations/documents', icon: 'FileText', description: 'Compliance docs, add & expiry alerts' },
  { title: 'Notifications', path: '/operations/notifications', icon: 'Bell', description: 'Inbox, outbox, templates & test send' },
  { title: 'Analytics', path: '/operations/analytics', icon: 'BarChart3', description: 'Fleet, bookings, fuel & route KPIs' },
  { title: 'Marketplace', path: '/operations/marketplace', icon: 'ShoppingBag', description: 'Create load/truck listings and place bids' },
  { title: 'Warehouse', path: '/operations/warehouse', icon: 'Building2', description: 'Warehouses & inventory stock lines' },
  { title: 'IoT', path: '/operations/iot', icon: 'Wifi', description: 'Register devices & post sensor readings' },
  { title: 'AI Assistant', path: '/operations/ai', icon: 'MessageSquare', description: 'Live ops Q&A from company data + forecasts' },
]

/** @deprecated Billing moved to main menu; kept empty for older imports. */
export const lrWorkflowCards = []

export const operationsHubSections = [
  {
    title: 'Enterprise Modules',
    description: 'GPS, fuel, analytics, and extended TMS capabilities.',
    cards: operationsCards,
  },
]
