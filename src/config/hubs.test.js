import { describe, it, expect } from 'vitest'
import { accountingCards } from '../config/accountingHub'
import { lrWorkflowCards, operationsCards, operationsHubSections } from '../config/operationsHub'
import { reportCards } from '../config/reportsHub'
import { mastersCards } from '../config/mastersHub'
import { settingsCards } from '../config/settingsHub'
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
  })

  it('operations hub cards have required fields', () => {
    expect(operationsCards.length).toBeGreaterThan(0)
    expectCardShape(operationsCards)
    expect(operationsHubSections).toHaveLength(1)
    expect(operationsHubSections[0].title).toBe('Enterprise Modules')
    expect(operationsCards.some((c) => ['POD', 'ePOD', 'Finance', 'Trips'].includes(c.title))).toBe(false)
  })

  it('billing is a main sidebar menu item', () => {
    expect(navigation.some((item) => item.title === 'Billing' && item.path === '/operations/billing/list')).toBe(true)
    expect(lrWorkflowCards).toHaveLength(0)
  })

  it('shipment management hub cards', () => {
    expectCardShape(shipmentManagementCards)
    expect(shipmentManagementCards.map((c) => c.title)).toEqual([
      'Quotation', 'Booking', 'LR List', 'Loading Slip', 'Transit Pass', 'Dispatch',
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


