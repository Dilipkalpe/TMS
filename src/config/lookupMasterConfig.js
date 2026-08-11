import {
  consigneesApi,
  consignorsApi,
  customersApi,
  itemsApi,
  driversApi,
  hrApi,
  lookupsApi,
  vendorsApi,
  vehiclesApi,
} from '../services/api'
import { lookupEntityLabel, resolveQuickCreatePayload } from './lookupLabels'

function norm(s) {
  return (s ?? '').trim().toLowerCase()
}

async function findByName(listApi, name, matchFn) {
  const q = name.trim()
  if (!q) return null
  const res = await listApi({ search: q, page: 1, pageSize: 10, status: 'Active' })
  const items = res?.items ?? (Array.isArray(res) ? res : [])
  return items.find((row) => matchFn(row, q)) ?? null
}

/** @typedef {{ key: string, label: string, type?: string, required?: boolean, placeholder?: string, defaultValue?: string }} MasterFieldDef */

/** @typedef {{
 *  entityLabel: string,
 *  addTitle: string,
 *  nameField: string,
 *  nameLabel: string,
 *  required: string[],
 *  fields: MasterFieldDef[],
 *  findDuplicate: (name: string) => Promise<object|null>,
 *  create: (form: Record<string, string>) => Promise<object>,
 *  toLabel: (record: object) => string,
 *  toId: (record: object) => string,
 * }} LookupMasterConfig */

/** @type {Record<string, (opts?: { employeeType?: string }) => LookupMasterConfig>} */
const CONFIG_BUILDERS = {
  customers: () => ({
    entityLabel: 'Customer',
    addTitle: 'Add Customer',
    nameField: 'name',
    nameLabel: 'Customer Name',
    required: ['name'],
    fields: [
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'gst', label: 'GST Number', type: 'text' },
    ],
    findDuplicate: (name) => findByName(customersApi.list, name, (r, q) => norm(r.name) === norm(q)),
    create: (form) => customersApi.create({ ...form, status: 'Active' }),
    toLabel: (r) => r.name ?? r.companyName ?? '',
    toId: (r) => r.id,
  }),

  vendors: () => ({
    entityLabel: 'Vendor',
    addTitle: 'Add Vendor',
    nameField: 'name',
    nameLabel: 'Vendor Name',
    required: ['name'],
    fields: [
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'address', label: 'Address', type: 'text' },
    ],
    findDuplicate: (name) => findByName(vendorsApi.list, name, (r, q) => norm(r.name) === norm(q)),
    create: (form) => vendorsApi.create({ ...form, category: 'General', status: 'Active' }),
    toLabel: (r) => r.name ?? '',
    toId: (r) => r.id,
  }),

  vehicles: () => ({
    entityLabel: 'Vehicle',
    addTitle: 'Add Vehicle',
    nameField: 'number',
    nameLabel: 'Vehicle Number',
    required: ['number'],
    fields: [
      { key: 'type', label: 'Type', type: 'text', defaultValue: 'Truck' },
      { key: 'model', label: 'Model', type: 'text' },
    ],
    findDuplicate: (name) => findByName(vehiclesApi.list, name, (r, q) => norm(r.number) === norm(q)),
    create: (form) => vehiclesApi.create({ ...form, status: 'Active', owner: 'Self' }),
    toLabel: (r) => r.number ?? r.name ?? '',
    toId: (r) => r.id,
  }),

  drivers: () => ({
    entityLabel: 'Driver',
    addTitle: 'Add Driver',
    nameField: 'name',
    nameLabel: 'Driver Name',
    required: ['name'],
    fields: [
      { key: 'phone', label: 'Phone', type: 'tel' },
    ],
    findDuplicate: async (name) => {
      const fromHr = await findByName(
        (p) => hrApi.employees({ ...p, employeeType: 'Driver' }),
        name,
        (r, q) => norm(r.name) === norm(q),
      )
      if (fromHr) return fromHr
      return findByName(driversApi.list, name, (r, q) => norm(r.name) === norm(q))
    },
    create: async (form) => {
      const code = `DRV${Date.now().toString().slice(-8)}`
      const res = await hrApi.saveEmployee({
        name: form.name,
        employeeCode: code,
        employeeType: 'Driver',
        employmentType: 'Permanent',
        phone: form.phone || undefined,
        status: 'Active',
      })
      const id = res?.id ?? res
      return { id: String(id), name: form.name, phone: form.phone }
    },
    toLabel: (r) => r.name ?? '',
    toId: (r) => String(r.id),
  }),

  employees: ({ employeeType = 'Staff' } = {}) => ({
    entityLabel: employeeType || 'Employee',
    addTitle: `Add ${employeeType || 'Employee'}`,
    nameField: 'name',
    nameLabel: `${employeeType || 'Employee'} Name`,
    required: ['name'],
    fields: [
      { key: 'phone', label: 'Phone', type: 'tel' },
    ],
    findDuplicate: (name) => findByName(
      (p) => hrApi.employees({ ...p, employeeType }),
      name,
      (r, q) => norm(r.name) === norm(q),
    ),
    create: async (form) => {
      const prefix = employeeType === 'Driver' ? 'DRV' : 'EMP'
      const code = `${prefix}${Date.now().toString().slice(-8)}`
      const res = await hrApi.saveEmployee({
        name: form.name,
        employeeCode: code,
        employeeType,
        employmentType: 'Permanent',
        phone: form.phone || undefined,
        status: 'Active',
      })
      const id = res?.id ?? res
      return { id: String(id), name: form.name, phone: form.phone }
    },
    toLabel: (r) => r.name ?? '',
    toId: (r) => String(r.id),
  }),

  consignors: () => ({
    entityLabel: 'Consignor',
    addTitle: 'Add Consignor',
    nameField: 'name',
    nameLabel: 'Consignor Name',
    required: ['name'],
    fields: [
      { key: 'phone', label: 'Mobile Number', type: 'tel' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'gst', label: 'GST Number', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
    ],
    findDuplicate: (name) => findByName(consignorsApi.list, name, (r, q) => norm(r.name) === norm(q)),
    create: (form) => consignorsApi.create({ ...form, status: 'Active' }),
    toLabel: (r) => {
      const name = r.companyName || r.name
      return r.city ? `${name} · ${r.city}` : name
    },
    toId: (r) => r.id,
  }),

  consignees: () => ({
    entityLabel: 'Consignee',
    addTitle: 'Add Consignee',
    nameField: 'name',
    nameLabel: 'Consignee Name',
    required: ['name'],
    fields: [
      { key: 'phone', label: 'Mobile Number', type: 'tel' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'gst', label: 'GST Number', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
    ],
    findDuplicate: (name) => findByName(consigneesApi.list, name, (r, q) => norm(r.name) === norm(q)),
    create: (form) => consigneesApi.create({ ...form, status: 'Active' }),
    toLabel: (r) => {
      const name = r.companyName || r.name
      return r.city ? `${name} · ${r.city}` : name
    },
    toId: (r) => r.id,
  }),

  items: () => ({
    entityLabel: 'Item',
    addTitle: 'Add Item',
    nameField: 'name',
    nameLabel: 'Item Name',
    required: ['name'],
    fields: [
      { key: 'hsn', label: 'HSN Code', type: 'text' },
      { key: 'defaultPackageType', label: 'Default Package Type', type: 'text', defaultValue: 'Box' },
      { key: 'unit', label: 'Unit', type: 'text', defaultValue: 'Kg' },
    ],
    findDuplicate: (name) => findByName(itemsApi.list, name, (r, q) => norm(r.name) === norm(q)),
    create: (form) => itemsApi.create({ ...form, status: 'Active' }),
    toLabel: (r) => {
      const bits = [r.hsn ? `HSN ${r.hsn}` : null, r.defaultPackageType || null].filter(Boolean)
      return bits.length ? `${r.name} · ${bits.join(' · ')}` : (r.name ?? '')
    },
    toId: (r) => r.id,
  }),
}

/** Resolve LookupSelect `type` (+ optional employeeType) to master config key. */
export function resolveLookupMasterKey(type, employeeType) {
  if (type === 'employees') return { key: 'employees', employeeType: employeeType || 'Staff' }
  if (type === 'drivers') return { key: 'drivers', employeeType: 'Driver' }
  return { key: type, employeeType: undefined }
}

/** Map party master API to config key. */
export function resolvePartyMasterKey(api) {
  if (api === consignorsApi) return 'consignors'
  if (api === consigneesApi) return 'consignees'
  if (api === customersApi) return 'customers'
  return null
}

/** @returns {LookupMasterConfig|null} */
export function getLookupMasterConfig(lookupKey, { employeeType } = {}) {
  const builder = CONFIG_BUILDERS[lookupKey]
  if (!builder) return null
  return builder({ employeeType })
}

export function buildMasterInitialForm(config, searchText = '') {
  const form = { [config.nameField]: searchText.trim() }
  for (const field of config.fields) {
    form[field.key] = field.defaultValue ?? ''
  }
  return form
}

export function validateMasterForm(config, form) {
  const errors = {}
  for (const key of config.required) {
    if (!form[key]?.trim()) {
      const label = key === config.nameField ? config.nameLabel : key
      errors[key] = `${label} is required.`
    }
  }
  return errors
}

/** Fallback quick-create for simple string lookups (legacy path). */
export async function quickCreateLookup(type, name, employeeType) {
  const { type: createType, employeeType: createRole } = resolveQuickCreatePayload(type, employeeType)
  return lookupsApi.quickCreate(createType, name, createRole)
}

export { lookupEntityLabel }
