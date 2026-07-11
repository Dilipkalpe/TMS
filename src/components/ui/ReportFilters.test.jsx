import { describe, it, expect } from 'vitest'
import { formatCurrency } from './ReportFilters'

describe('formatCurrency', () => {
  it('formats INR amounts', () => {
    expect(formatCurrency(125000)).toMatch(/1,25,000|125,000/)
  })

  it('returns non-numbers unchanged', () => {
    expect(formatCurrency('N/A')).toBe('N/A')
  })
})
