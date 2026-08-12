import { describe, it, expect } from 'vitest'
import { accountingCards, accountingHubSections } from '../config/accountingHub'
import { lrWorkflowCards, operationsCards, operationsHubSections } from '../config/operationsHub'
import { reportCards, reportsHubSections } from '../config/reportsHub'
import { mastersCards } from '../config/mastersHub'
import { settingsCards, settingsHubSections } from '../config/settingsHub'
import { hrPayrollHubSections } from '../config/hrPayrollHub'
import { shipmentManagementCards } from '../config/shipmentManagementHub'
import { deliveryManagementCards } from '../config/deliveryManagementHub'
import { expensesCards } from '../config/expensesHub'
import { navigation } from '../config/navigation'

function expectUniquePaths(cards) {
  const paths = cards.map((c) => c.path)
  expect(new Set(paths).size).toBe(paths.length)
}

function expectCardShape(cards) {
  expect(cards.every((c) => c.title && c.path?.startsWith('/') && c.icon && c.description)).toBe(true)
}

describe('hub navigation config', () => {
  it('accounting hub cards have unique paths', () => {
    expectUniquePaths(accountingCards)
    expectCardShape(accountingCards)
    expect(accountingHubSections.length).toBeGreaterThan(1)
    expect(accountingHubSections.every((s) => s.cards?.length > 0)).toBe(true)
  })

  it('operations hub cards have required fields', () => {
    expect(operationsCards.length).toBeGreaterThan(0)
    expectCardShape(operationsCards)
    expectUniquePaths(operationsCards)
    expect(operationsHubSections.map((s) => s.title)).toEqual([
      'Core operations',
      'Intelligence & compliance',
      'Enterprise extensions',
    ])
    expect(operationsHubSections.every((s) => s.cards?.length > 0)).toBe(true)
    expect(operationsCards.some((c) => ['POD', 'ePOD'].includes(c.title))).toBe(false)
    expect(operationsCards.some((c) => c.title === 'Trips')).toBe(true)
    expect(operationsCards.some((c) => c.title === 'Finance')).toBe(true)
  })

  it('billing is a main sidebar menu item', () => {
    expect(navigation.some((item) => item.title === 'Billing' && item.path === '/operations/billing/list')).toBe(true)
    expect(lrWorkflowCards).toHaveLength(0)
  })

  it('shipment management hub cards', () => {
    expectCardShape(shipmentManagementCards)
    expect(shipmentManagementCards.map((c) => c.title)).toEqual([
      'Quotation', 'Booking', 'LR List', 'Loading Slip', 'Transit Pass', 'Dispatch', 'Hub Transfer',
    ])
  })

  it('delivery management hub cards', () => {
    expectCardShape(deliveryManagementCards)
    expect(deliveryManagementCards.map((c) => c.title)).toEqual([
      'In Transit', 'Delivery Complete', 'POD',
    ])
  })

  it('reports hub includes cash flow report', () => {
    expect(reportCards.some((c) => c.path === '/reports/cash-flow')).toBe(true)
    expect(reportCards.some((c) => c.path === '/reports/loading-dispatch')).toBe(true)
    expect(reportCards.some((c) => c.path === '/reports/hub-transfer')).toBe(true)
    expect(reportCards.some((c) => c.path === '/reports/delivery-pod')).toBe(true)
    expect(reportCards.some((c) => c.path === '/reports/direct-lr-pl')).toBe(true)
    expect(reportCards.some((c) => c.path === '/reports/booking-pl')).toBe(true)
    expect(reportsHubSections.map((s) => s.title)).toEqual([
      'Operations reports',
      'Finance reports',
    ])
  })

  it('masters hub cards cover master data', () => {
    expectUniquePaths(mastersCards)
    expectCardShape(mastersCards)
    expect(mastersCards.map((c) => c.path)).toEqual(expect.arrayContaining([
      '/vehicles', '/customers', '/vendors', '/consignors', '/consignees', '/items', '/freight-rates', '/hr/employees',
    ]))
  })

  it('settings hub includes general and sub pages', () => {
    expectUniquePaths(settingsCards)
    expectCardShape(settingsCards)
    expect(settingsCards[0].path).toBe('/settings/general')
    expect(settingsCards.some((c) => c.path === '/settings/print-templates')).toBe(true)
    expect(settingsCards.some((c) => c.path === '/settings/data-cleanup')).toBe(true)
    expect(settingsHubSections).toHaveLength(3)
  })

  it('sidebar navigation is flat hub roots only', () => {
    expect(navigation.every((item) => item.path && !item.children?.length)).toBe(true)
    expect(navigation.some((item) => item.path === '/shipment-management')).toBe(true)
    expect(navigation.some((item) => item.path === '/delivery-management')).toBe(true)
    expect(navigation.some((item) => item.path === '/operations')).toBe(true)
    expect(navigation.some((item) => item.path === '/masters')).toBe(true)
    expect(navigation.some((item) => item.path === '/settings')).toBe(true)
    expect(navigation.some((item) => item.title === 'Booking')).toBe(false)
    expect(navigation.some((item) => item.title === 'LR List')).toBe(false)
    expect(navigation.some((item) => item.title === 'HR & Payroll')).toBe(true)
    expect(navigation.some((item) => item.title === 'HR')).toBe(false)
    expect(navigation.some((item) => item.title === 'Payroll')).toBe(false)
    expect(navigation.some((item) => item.title === 'Admin')).toBe(false)
    expect(navigation.some((item) => item.title === 'Loading Slip')).toBe(false)
  })

  it('hr payroll hub merges hr and payroll sections', () => {
    expect(hrPayrollHubSections).toHaveLength(2)
    expect(hrPayrollHubSections[0].title).toBe('HR')
    expect(hrPayrollHubSections[1].title).toBe('Payroll')
    expect(hrPayrollHubSections.every((s) => s.cards?.length > 0)).toBe(true)
  })

  it('expenses hub merges trip and general expenses', () => {
    expectCardShape(expensesCards)
    expect(expensesCards.map((c) => c.title)).toEqual([
      'Trip Expenses', 'Expense Approval', 'Expense Management',
    ])
  })
})


