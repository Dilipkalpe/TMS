import { describe, it, expect } from 'vitest'
import { createSubscriptionAccess } from './subscriptionAccess'

describe('subscriptionAccess', () => {
  it('allows platform admin on all tenant paths', () => {
    const { canAccessPath } = createSubscriptionAccess({ isPlatformAdmin: true, role: 'Super Admin' })
    expect(canAccessPath('/accounting/outstanding')).toBe(true)
    expect(canAccessPath('/bookings')).toBe(true)
  })

  it('restricts accounting paths by feature flags', () => {
    const user = { role: 'Accountant', features: ['accounting'] }
    const { canAccessPath } = createSubscriptionAccess(user)
    expect(canAccessPath('/accounting/ledger-report')).toBe(true)
    expect(canAccessPath('/accounting/outstanding')).toBe(false)
    expect(canAccessPath('/accounting/gst')).toBe(false)
  })

  it('allows outstanding when feature enabled', () => {
    const { canAccessPath } = createSubscriptionAccess({ role: 'Admin', features: ['outstanding'] })
    expect(canAccessPath('/accounting/outstanding')).toBe(true)
  })

  it('blocks platform hub for non-platform users', () => {
    const { canAccessPath } = createSubscriptionAccess({ role: 'Admin', features: ['dashboard'] })
    expect(canAccessPath('/platform')).toBe(false)
  })

  it('hasFeature honors unlimited_users', () => {
    const { hasFeature } = createSubscriptionAccess({ role: 'Operator', features: ['unlimited_users'] })
    expect(hasFeature('anything')).toBe(true)
  })
})
