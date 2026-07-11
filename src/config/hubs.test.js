import { describe, it, expect } from 'vitest'
import { accountingCards } from '../config/accountingHub'
import { operationsCards } from '../config/operationsHub'
import { reportCards } from '../config/reportsHub'

describe('hub navigation config', () => {
  it('accounting hub cards have unique paths', () => {
    const paths = accountingCards.map((c) => c.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(accountingCards.every((c) => c.title && c.path.startsWith('/'))).toBe(true)
  })

  it('operations hub cards have required fields', () => {
    expect(operationsCards.length).toBeGreaterThan(0)
    expect(operationsCards.every((c) => c.icon && c.description)).toBe(true)
  })

  it('reports hub includes cash flow report', () => {
    expect(reportCards.some((c) => c.path === '/reports/cash-flow')).toBe(true)
  })
})
