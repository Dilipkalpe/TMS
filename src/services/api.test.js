import { describe, it, expect } from 'vitest'
import { platformApi, portalApi, notificationsApi, lrProcessApi, unwrapPaginated } from './api'

describe('unwrapPaginated', () => {
  it('returns rows from paginated object', () => {
    expect(unwrapPaginated({ rows: [{ id: 1 }], total: 1 })).toEqual([{ id: 1 }])
  })
  it('returns array as-is', () => {
    expect(unwrapPaginated([{ id: 1 }])).toEqual([{ id: 1 }])
  })
  it('returns empty array for invalid input', () => {
    expect(unwrapPaginated(null)).toEqual([])
    expect(unwrapPaginated({})).toEqual([])
  })
})

describe('API service exports', () => {
  it('platformApi has all required methods', () => {
    expect(typeof platformApi.companies).toBe('function')
    expect(typeof platformApi.createCompany).toBe('function')
    expect(typeof platformApi.updateCompany).toBe('function')
    expect(typeof platformApi.toggleCompanyStatus).toBe('function')
    expect(typeof platformApi.plans).toBe('function')
    expect(typeof platformApi.billing).toBe('function')
    expect(typeof platformApi.changePlan).toBe('function')
  })

  it('portalApi has pagination-enabled methods', () => {
    expect(typeof portalApi.shipments).toBe('function')
    expect(typeof portalApi.invoices).toBe('function')
    expect(typeof portalApi.tracking).toBe('function')
    expect(typeof portalApi.pod).toBe('function')
    expect(typeof portalApi.shareLink).toBe('function')
  })

  it('notificationsApi has preferences methods', () => {
    expect(typeof notificationsApi.preferences).toBe('function')
    expect(typeof notificationsApi.savePreferences).toBe('function')
    expect(typeof notificationsApi.channelSettings).toBe('function')
    expect(typeof notificationsApi.templates).toBe('function')
    expect(typeof notificationsApi.outbox).toBe('function')
    expect(typeof notificationsApi.sendTest).toBe('function')
  })
})

describe('lrProcessApi — operational workflow endpoints', () => {
  it('exposes loading → transit → dispatch → delivery → POD flow methods', () => {
    expect(typeof lrProcessApi.get).toBe('function')
    expect(typeof lrProcessApi.saveLoadingSheet).toBe('function')
    expect(typeof lrProcessApi.createTransitPass).toBe('function')
    expect(typeof lrProcessApi.markTransitPassReady).toBe('function')
    expect(typeof lrProcessApi.confirmDispatch).toBe('function')
    expect(typeof lrProcessApi.addCheckpoint).toBe('function')
    expect(typeof lrProcessApi.updateInTransitStatus).toBe('function')
    expect(typeof lrProcessApi.saveDeliverySheet).toBe('function')
    expect(typeof lrProcessApi.verifyPod).toBe('function')
    expect(typeof lrProcessApi.rejectPod).toBe('function')
  })
})
