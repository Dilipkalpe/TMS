/** Pure subscription/plan access rules (testable without React). */

export function createSubscriptionAccess(user) {
  const features = user?.features ?? []
  const planCode = user?.planCode ?? 'professional'

  const hasFeature = (feature) => {
    if (!user) return true
    if (user.isPlatformAdmin) return true
    if (!feature) return true
    return features.includes(feature) || features.includes('unlimited_users')
  }

  const canAccessPath = (path) => {
    if (!user) return true
    if (path.startsWith('/platform')) return Boolean(user.isPlatformAdmin)
    if (user.isPlatformAdmin) return true
    if (path.startsWith('/settings')) {
      return hasFeature('multi_branch')
        || user?.role === 'Admin'
        || user?.role === 'Super Admin'
        || Boolean(user?.isPlatformAdmin)
    }
    if (path.startsWith('/accounting') || path.startsWith('/reports')) {
      if (path.includes('outstanding')) return hasFeature('outstanding')
      if (path.includes('profit-loss') || path.includes('booking-pl') || path.includes('direct-lr-pl')) return hasFeature('profit_loss')
      if (path.includes('balance-sheet')) return hasFeature('balance_sheet')
      if (path.includes('gst')) return hasFeature('gst')
      return hasFeature('accounting') || hasFeature('dashboard')
    }
    if (path.startsWith('/bookings')) return hasFeature('booking')
    if (path.startsWith('/lr') || path === '/operations' || path === '/shipment-management' || path === '/delivery-management'
      || path.startsWith('/operations/loading-slip')
      || path.startsWith('/operations/transit-pass')
      || path.startsWith('/operations/dispatch')
      || path.startsWith('/operations/in-transit')
      || path.startsWith('/operations/delivery-complete')
      || path.startsWith('/operations/delivery/pod')
      || path.startsWith('/operations/billing')
      || path.startsWith('/operations/trip-expenses')) return hasFeature('lr')
    if (path === '/' || path === '') return hasFeature('dashboard') || hasFeature('booking')
    return true
  }

  /** First safe landing path when dashboard (/) is not allowed — avoids TenantGuard redirect loops. */
  const firstAccessiblePath = () => {
    if (!user || user.isPlatformAdmin) return '/'
    if (hasFeature('dashboard') || hasFeature('booking')) return '/'
    if (hasFeature('lr')) return '/lr/list'
    if (hasFeature('accounting')) return '/accounting'
    if (hasFeature('outstanding')) return '/accounting/outstanding'
    return '/settings'
  }

  return { planCode, features, hasFeature, canAccessPath, firstAccessiblePath }
}

export const PLAN_MODULES = {
  booking: ['/bookings'],
  lr: ['/lr', '/shipment-management', '/delivery-management', '/operations', '/operations/loading-slip', '/operations/transit-pass', '/operations/dispatch', '/operations/in-transit', '/operations/delivery-complete', '/operations/delivery/pod', '/operations/billing', '/operations/trip-expenses'],
  billing: ['/bookings'],
  outstanding: ['/accounting/outstanding'],
  accounting: ['/accounting'],
  dashboard: ['/'],
  profit_loss: ['/accounting/profit-loss', '/reports/booking-pl', '/reports/direct-lr-pl'],
  balance_sheet: ['/accounting/balance-sheet'],
  gst: ['/accounting/gst'],
  export: ['*'],
  multi_branch: ['/settings/branches'],
}
