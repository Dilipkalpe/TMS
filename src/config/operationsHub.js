export const operationsCards = [
  { title: 'Customer Portal', path: '/operations/customer-portal', icon: 'UserCircle', description: 'Customer bookings, tracking, invoices & POD' },
  { title: 'GPS Tracking', path: '/operations/gps', icon: 'MapPin', description: 'Live fleet map, history & geofencing' },
  { title: 'Fuel Management', path: '/operations/fuel', icon: 'Gauge', description: 'Fuel entries, analytics & theft alerts' },
  { title: 'Route Optimizer', path: '/operations/routing', icon: 'Route', description: 'AI stop sequencing, ETA & fuel estimates' },
  { title: 'Shipments', path: '/operations/shipments', icon: 'Package', description: 'Freight shipments & tracking' },
  { title: 'Predictive Maintenance', path: '/maintenance', icon: 'Wrench', description: 'Service schedules & breakdown risk' },
  { title: 'Documents', path: '/operations/documents', icon: 'FileText', description: 'Compliance docs & expiry alerts' },
  { title: 'Notifications', path: '/operations/notifications', icon: 'Bell', description: 'In-app, SMS & WhatsApp alerts' },
  { title: 'Analytics', path: '/operations/analytics', icon: 'BarChart3', description: 'Fleet utilization & route profitability' },
  { title: 'Marketplace', path: '/operations/marketplace', icon: 'ShoppingBag', description: 'Freight load & truck listings' },
  { title: 'Warehouse', path: '/operations/warehouse', icon: 'Building2', description: 'Warehouse & inventory' },
  { title: 'IoT', path: '/operations/iot', icon: 'Wifi', description: 'Telematics devices & sensor data' },
  { title: 'AI Assistant', path: '/operations/ai', icon: 'MessageSquare', description: 'Chat assistant & forecasts' },
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
