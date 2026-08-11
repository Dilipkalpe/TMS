/** Accent tone keys mapped in OperationsHub tiles. */
export const operationsCards = [
  { title: 'Customer Portal', path: '/operations/customer-portal', icon: 'UserCircle', description: 'Customer bookings, tracking, invoices & POD', tone: 'sky', chip: 'Portal' },
  { title: 'Shipments', path: '/operations/shipments', icon: 'Package', description: 'Freight shipments search & live tracking', tone: 'blue', chip: 'Live' },
  { title: 'Trips', path: '/operations/trips', icon: 'Truck', description: 'Create trips, start/complete status for routing', tone: 'teal', chip: 'Trips' },
  { title: 'GPS Tracking', path: '/operations/gps', icon: 'MapPin', description: 'Live fleet map, history & geofencing', tone: 'indigo', chip: 'Map' },
  { title: 'Fuel Management', path: '/operations/fuel', icon: 'Gauge', description: 'Fuel entries, analytics & theft alerts', tone: 'amber', chip: 'Fuel' },
  { title: 'Route Optimizer', path: '/operations/routing', icon: 'Route', description: 'Stop sequencing, ETA & fuel estimates', tone: 'violet', chip: 'Route' },
  { title: 'Finance', path: '/operations/finance', icon: 'Wallet', description: 'Ops revenue summary, invoices & expenses', tone: 'emerald', chip: 'Finance' },
  { title: 'Predictive Maintenance', path: '/maintenance', icon: 'Wrench', description: 'Service schedules & breakdown risk', tone: 'slate', chip: 'Maint' },
  { title: 'Documents', path: '/operations/documents', icon: 'FileText', description: 'Compliance docs, add & expiry alerts', tone: 'rose', chip: 'Docs' },
  { title: 'Notifications', path: '/operations/notifications', icon: 'Bell', description: 'Inbox, outbox, templates & test send', tone: 'orange', chip: 'Alert' },
  { title: 'Analytics', path: '/operations/analytics', icon: 'BarChart3', description: 'Fleet, bookings, fuel & route KPIs', tone: 'green', chip: 'KPI' },
  { title: 'Marketplace', path: '/operations/marketplace', icon: 'ShoppingBag', description: 'Create load/truck listings and place bids', tone: 'cyan', chip: 'Ext' },
  { title: 'Warehouse', path: '/operations/warehouse', icon: 'Building2', description: 'Warehouses & inventory stock lines', tone: 'stone', chip: 'Ext' },
  { title: 'IoT', path: '/operations/iot', icon: 'Wifi', description: 'Register devices & post sensor readings', tone: 'lime', chip: 'Ext' },
  { title: 'AI Assistant', path: '/operations/ai', icon: 'MessageSquare', description: 'Live ops Q&A from company data + forecasts', tone: 'ink', chip: 'AI' },
]

/** @deprecated Billing moved to main menu; kept empty for older imports. */
export const lrWorkflowCards = []

const byTitle = Object.fromEntries(operationsCards.map((c) => [c.title, c]))

function pick(...titles) {
  return titles.map((t) => byTitle[t]).filter(Boolean)
}

/** Option B — Command Center sections */
export const operationsHubSections = [
  {
    title: 'Core operations',
    description: 'Day-to-day movement, tracking, and control',
    cards: pick('Shipments', 'Trips', 'GPS Tracking', 'Fuel Management', 'Route Optimizer', 'Customer Portal'),
  },
  {
    title: 'Intelligence & compliance',
    description: 'Insights, documents, alerts, and assistants',
    cards: pick('Analytics', 'Documents', 'Notifications', 'AI Assistant', 'Predictive Maintenance'),
  },
  {
    title: 'Enterprise extensions',
    description: 'Marketplace, warehouse, IoT, and ops finance',
    cards: pick('Marketplace', 'Warehouse', 'IoT', 'Finance'),
  },
]

export const operationsQuickActions = [
  { label: 'Open GPS map', path: '/operations/gps', variant: 'accent' },
  { label: 'View analytics', path: '/operations/analytics', variant: 'ghost' },
  { label: 'Ask AI assistant', path: '/operations/ai', variant: 'ghost' },
]
