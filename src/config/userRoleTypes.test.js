import { describe, expect, it } from 'vitest'
import { USER_ROLE_TYPES, USER_ROLE_TYPE_CODES, validateNewRoleTypeName } from './userRoleTypes'

describe('userRoleTypes', () => {
  it('lists system User Role Types', () => {
    expect(USER_ROLE_TYPES.map((r) => r.code)).toEqual([
      'Admin',
      'Branch Manager',
      'Accountant',
      'Operator',
    ])
  })

  it('rejects empty role type', () => {
    expect(validateNewRoleTypeName('').ok).toBe(false)
    expect(validateNewRoleTypeName('   ').error).toMatch(/required/i)
  })

  it('rejects duplicate case-insensitive', () => {
    expect(validateNewRoleTypeName('operator').ok).toBe(false)
    expect(validateNewRoleTypeName('ADMIN', ['Admin']).error).toMatch(/already exists/i)
  })

  it('accepts new role type for selection', () => {
    const res = validateNewRoleTypeName('Dispatcher', USER_ROLE_TYPE_CODES)
    expect(res).toEqual({ ok: true, name: 'Dispatcher' })
  })
})
