import { describe, expect, it } from 'vitest'
import { ADMIN_LOCKED_MENU_KEYS, buildMenuCatalog, canAccessMenuKey } from './menuCatalog'

describe('menuCatalog', () => {
  it('includes sidebar and role-menus settings key', () => {
    const keys = buildMenuCatalog().map((i) => i.key)
    expect(keys).toContain('/')
    expect(keys).toContain('/settings/role-menus')
    expect(keys).toContain('/accounting/outstanding')
  })

  it('locks admin required keys', () => {
    expect(ADMIN_LOCKED_MENU_KEYS).toEqual(
      expect.arrayContaining(['/settings', '/settings/users', '/settings/role-menus']),
    )
  })

  it('canAccessMenuKey supports prefix and legacy null', () => {
    expect(canAccessMenuKey('/reports/income', null)).toBe(true)
    expect(canAccessMenuKey('/reports/income', ['/reports'])).toBe(true)
    expect(canAccessMenuKey('/reports/income', ['/shipment-management'])).toBe(false)
    expect(canAccessMenuKey('/', ['/'])).toBe(true)
    expect(canAccessMenuKey('/lr/list', ['/LR/list'])).toBe(true)
  })
})
