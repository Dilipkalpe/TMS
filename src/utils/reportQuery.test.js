import { describe, it, expect } from 'vitest'
import { toReportQuery, defaultReportFilters } from './reportQuery'

describe('reportQuery', () => {
  it('maps filter fields to query params', () => {
    expect(toReportQuery({
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      customerId: 'C-1',
      vendorId: '',
      status: 'Hub Received',
      vehicle: 'MH12',
      hubBranchId: 'hub-1',
      workflow: 'direct',
    })).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      customerId: 'C-1',
      status: 'Hub Received',
      vehicle: 'MH12',
      hubBranchId: 'hub-1',
      workflow: 'direct',
    })
  })

  it('defaultReportFilters returns month-to-date range', () => {
    const filters = defaultReportFilters()
    expect(filters.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(filters.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(filters.customerId).toBe('')
    expect(filters.vendorId).toBe('')
    expect(filters.status).toBe('')
    expect(filters.vehicle).toBe('')
    expect(filters.hubBranchId).toBe('')
    expect(filters.workflow).toBe('')
  })
})
