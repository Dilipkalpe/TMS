/** Map ERP module labels to list/hub paths for breadcrumbs. */
const MODULE_PATHS = {
  Dashboard: '/',
  Booking: '/bookings',
  'Shipment Management': '/shipment-management',
  'Delivery Management': '/delivery-management',
  LR: '/lr/list',
  'LR Management': '/lr/list',
  Operations: '/operations',
  Billing: '/operations/billing/list',
  Accounting: '/accounting',
  Accounts: '/accounting',
  Reports: '/reports',
  Customers: '/customers',
  Vehicles: '/vehicles',
  Drivers: '/hr/employees',
  Masters: '/masters',
  Vendors: '/vendors',
  HR: '/hr',
  'HR & Payroll': '/hr',
  Payroll: '/hr',
  Admin: '/masters',
  Settings: '/settings',
  Fleet: '/maintenance',
  Maintenance: '/maintenance',
  Quotations: '/quotations',
  'Freight Rates': '/freight-rates',
  Expenses: '/expenses',
  Consignors: '/consignors',
  Consignees: '/consignees',
  Items: '/items',
  Platform: '/platform',
}

/**
 * @param {string} [module]
 * @param {string} [title]
 * @returns {{ label: string, path?: string }[]}
 */
export function buildErpBreadcrumb(module, title) {
  const pageTitle = (title || module || 'Overview').trim()
  const items = [{ label: 'Home', path: '/' }]

  if (!module || module === 'Dashboard') {
    if (pageTitle !== 'Home' && pageTitle !== 'Overview') {
      items.push({ label: pageTitle })
    } else {
      items.push({ label: 'Overview' })
    }
    return items
  }

  const modulePath = MODULE_PATHS[module]
  const moduleCrumb = modulePath ? { label: module, path: modulePath } : { label: module }

  if (pageTitle === module) {
    items.push(moduleCrumb)
    return items
  }

  items.push(moduleCrumb)
  items.push({ label: pageTitle })
  return items
}
