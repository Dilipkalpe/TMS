import { bookingsApi, vehiclesApi, hrApi, customersApi, vendorsApi, lrApi } from '../services/api'

let cachedIndex = null
let cachePromise = null

async function firstPage(api, pageSize = 25) {
  const res = await api.list({ page: 1, pageSize }).catch(() => ({ items: [] }))
  return Array.isArray(res) ? res : (res?.items ?? [])
}

async function buildIndex() {
  const [bookings, vehicles, employees, customers, vendors, lrs] = await Promise.all([
    firstPage(bookingsApi),
    firstPage(vehiclesApi),
    firstPage(hrApi.employees),
    firstPage(customersApi),
    firstPage(vendorsApi),
    firstPage(lrApi),
  ])

  const items = []
  bookings.forEach((b) => items.push({ id: b.id, label: b.id, sub: b.customer, path: `/bookings/${b.id}`, keywords: `${b.id} ${b.customer} ${b.from} ${b.to}`.toLowerCase() }))
  lrs.forEach((l) => items.push({ id: l.lrNumber, label: l.lrNumber, sub: `${l.from} → ${l.to}`, path: '/lr', keywords: `${l.lrNumber} ${l.consignor} ${l.consignee}`.toLowerCase() }))
  vehicles.forEach((v) => items.push({ id: v.id, label: v.number, sub: v.type, path: `/vehicles/${v.id}`, keywords: `${v.number} ${v.type}`.toLowerCase() }))
  employees.forEach((e) => items.push({ id: e.id, label: e.name, sub: e.employeeType, path: `/hr/employees/${e.id}`, keywords: `${e.name} ${e.employeeCode} ${e.employeeType}`.toLowerCase() }))
  customers.forEach((c) => items.push({ id: c.id, label: c.name, sub: c.contact, path: `/customers/${c.id}`, keywords: `${c.name} ${c.contact}`.toLowerCase() }))
  vendors.forEach((v) => items.push({ id: v.id, label: v.name, sub: v.category, path: `/vendors/${v.id}`, keywords: `${v.name} ${v.category}`.toLowerCase() }))
  return items
}

export async function ensureSearchIndex() {
  if (cachedIndex) return cachedIndex
  if (!cachePromise) cachePromise = buildIndex().then((idx) => { cachedIndex = idx; return idx })
  return cachePromise
}

export async function searchAll(query, limit = 8) {
  const index = await ensureSearchIndex()
  const q = query.trim().toLowerCase()
  if (!q) return []
  return index.filter((item) => item.keywords.includes(q)).slice(0, limit)
}

export function invalidateSearchIndex() {
  cachedIndex = null
  cachePromise = null
}
