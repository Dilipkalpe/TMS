import { bookings } from '../data/bookings'
import { lrList } from '../data/lr'
import { vehicles } from '../data/vehicles'
import { drivers } from '../data/drivers'
import { customers } from '../data/customers'
import { vendors } from '../data/vendors'

function buildIndex() {
  const items = []

  bookings.forEach((b) => {
    items.push({
      id: b.id,
      type: 'Booking',
      title: b.id,
      subtitle: `${b.customer} · ${b.from} → ${b.to}`,
      path: `/bookings/${b.id}`,
      keywords: [b.id, b.customer, b.from, b.to, b.vehicle, b.driver, b.status].join(' ').toLowerCase(),
    })
  })

  lrList.forEach((l) => {
    items.push({
      id: l.lrNumber,
      type: 'LR',
      title: l.lrNumber,
      subtitle: `${l.from} → ${l.to} · ${l.vehicle}`,
      path: '/lr',
      keywords: [l.lrNumber, l.consignor, l.consignee, l.vehicle, l.driver].join(' ').toLowerCase(),
    })
  })

  vehicles.forEach((v) => {
    items.push({
      id: v.id,
      type: 'Vehicle',
      title: v.number,
      subtitle: `${v.type} · ${v.status}`,
      path: `/vehicles/${v.id}`,
      keywords: [v.id, v.number, v.type, v.model, v.status].join(' ').toLowerCase(),
    })
  })

  drivers.forEach((d) => {
    items.push({
      id: d.id,
      type: 'Driver',
      title: d.name,
      subtitle: `${d.phone} · ${d.status}`,
      path: `/drivers/${d.id}`,
      keywords: [d.id, d.name, d.phone, d.license, d.status].join(' ').toLowerCase(),
    })
  })

  customers.forEach((c) => {
    items.push({
      id: c.id,
      type: 'Customer',
      title: c.name,
      subtitle: c.address ?? '',
      path: `/customers/${c.id}`,
      keywords: [c.id, c.name, c.gst, c.phone, c.address].join(' ').toLowerCase(),
    })
  })

  vendors.forEach((v) => {
    items.push({
      id: v.id,
      type: 'Vendor',
      title: v.name,
      subtitle: v.category ?? '',
      path: `/vendors/${v.id}`,
      keywords: [v.id, v.name, v.category, v.phone].join(' ').toLowerCase(),
    })
  })

  return items
}

export const searchIndex = buildIndex()

export function searchAll(query, limit = 8) {
  const q = query.trim().toLowerCase()
  if (!q || q.length < 2) return []
  return searchIndex.filter((item) => item.keywords.includes(q)).slice(0, limit)
}
