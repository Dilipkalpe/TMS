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
    if (path.startsWith('/settings')) return hasFeature('multi_branch') || user?.role === 'Admin'
    if (path.startsWith('/accounting') || path.startsWith('/reports')) {
      if (path.includes('outstanding')) return hasFeature('outstanding')
      if (path.includes('profit-loss') || path.includes('booking-pl')) return hasFeature('profit_loss')
      if (path.includes('balance-sheet')) return hasFeature('balance_sheet')
      if (path.includes('gst')) return hasFeature('gst')
      return hasFeature('accounting') || hasFeature('dashboard')
    }
    if (path.startsWith('/bookings')) return hasFeature('booking')
    if (path.startsWith('/lr')) return hasFeature('lr')
    if (path === '/' || path === '') return hasFeature('dashboard') || hasFeature('booking')
    return true
  }

  return { planCode, features, hasFeature, canAccessPath }
}

export const PLAN_MODULES = {
  booking: ['/bookings'],
  lr: ['/lr'],
  billing: ['/bookings'],
  outstanding: ['/accounting/outstanding'],
  accounting: ['/accounting'],
  dashboard: ['/'],
  profit_loss: ['/accounting/profit-loss', '/reports/booking-pl'],
  balance_sheet: ['/accounting/balance-sheet'],
  gst: ['/accounting/gst'],
  export: ['*'],
  multi_branch: ['/settings/branches'],
}
