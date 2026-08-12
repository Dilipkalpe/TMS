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

  it('blocks paths not in role menuKeys', () => {
    const { canAccessPath } = createSubscriptionAccess({
      role: 'Operator',
      features: ['lr', 'dashboard', 'accounting', 'outstanding'],
      menuKeys: ['/', '/shipment-management', '/lr/list'],
    })
    expect(canAccessPath('/')).toBe(true)
    expect(canAccessPath('/lr/list')).toBe(true)
    expect(canAccessPath('/accounting/outstanding')).toBe(false)
    expect(canAccessPath('/reports')).toBe(false)
  })

  it('allows all paths when menuKeys is null (legacy)', () => {
    const { canAccessPath } = createSubscriptionAccess({
      role: 'Operator',
      features: ['lr', 'dashboard'],
      menuKeys: null,
    })
    expect(canAccessPath('/shipment-management')).toBe(true)
  })

  it('does not show LR List hub card from shipment parent alone', () => {
    const { canAccessPath } = createSubscriptionAccess({
      role: 'Operator',
      features: ['lr'],
      menuKeys: ['/shipment-management'],
    })
    expect(canAccessPath('/shipment-management')).toBe(true)
    expect(canAccessPath('/lr/list')).toBe(false)
    expect(canAccessPath('/operations/loading-slip/list')).toBe(false)
  })

  it('shows LR List card when its hub key is selected', () => {
    const { canAccessPath } = createSubscriptionAccess({
      role: 'Operator',
      features: ['lr', 'booking'],
      menuKeys: ['/shipment-management', '/lr/list'],
    })
    expect(canAccessPath('/shipment-management')).toBe(true)
    expect(canAccessPath('/lr/list')).toBe(true)
    expect(canAccessPath('/bookings')).toBe(false)
    expect(canAccessPath('/bookings/new')).toBe(false)
  })

  it('opens shipment hub when only LR List child key is selected', () => {
    const { canAccessPath } = createSubscriptionAccess({
      role: 'Operator',
      features: ['lr'],
      menuKeys: ['/lr/list'],
    })
    expect(canAccessPath('/lr/list')).toBe(true)
    expect(canAccessPath('/shipment-management')).toBe(true)
    expect(canAccessPath('/lr/entry')).toBe(true)
    expect(canAccessPath('/bookings/new')).toBe(false)
  })

  it('delivery hub: only selected POD card/quick action, not In transit', () => {
    const { canAccessPath } = createSubscriptionAccess({
      role: 'Operator',
      features: ['lr'],
      menuKeys: ['/delivery-management', '/operations/delivery/pod/list'],
    })
    expect(canAccessPath('/delivery-management')).toBe(true)
    expect(canAccessPath('/operations/delivery/pod/list')).toBe(true)
    expect(canAccessPath('/operations/delivery/pod')).toBe(true)
    expect(canAccessPath('/operations/in-transit/list')).toBe(false)
    expect(canAccessPath('/operations/delivery-complete/list')).toBe(false)
  })

  it('masters deep new route requires vehicles hub key', () => {
    const { canAccessPath } = createSubscriptionAccess({
      role: 'Operator',
      features: ['lr'],
      menuKeys: ['/masters', '/customers'],
    })
    expect(canAccessPath('/customers')).toBe(true)
    expect(canAccessPath('/vehicles/new')).toBe(false)
    expect(canAccessPath('/vehicles')).toBe(false)
  })

  it('billing sidebar key unlocks billing invoice deep path', () => {
    const { canAccessPath } = createSubscriptionAccess({
      role: 'Operator',
      features: ['lr'],
      menuKeys: ['/operations/billing/list'],
    })
    expect(canAccessPath('/operations/billing/list')).toBe(true)
    expect(canAccessPath('/operations/billing/invoice')).toBe(true)
  })

  it('blocks /lr/list when menu allows but plan lacks lr feature', () => {
    const { canAccessPath } = createSubscriptionAccess({
      role: 'Operator',
      features: ['dashboard'],
      menuKeys: ['/shipment-management', '/lr/list'],
    })
    expect(canAccessPath('/lr/list')).toBe(false)
    expect(canAccessPath('/shipment-management')).toBe(false)
  })
})
