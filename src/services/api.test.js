import { describe, it, expect } from 'vitest'
import { platformApi, portalApi, notificationsApi } from './api'

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
