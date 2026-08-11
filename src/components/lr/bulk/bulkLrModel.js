import { emptyLrEntryForm, emptyLrItem, buildLrApiPayload } from '../LrEntryFormLayout'

export const BULK_LR_FIELD_KEYS = [
  'invoiceNo',
  'description',
  'packages',
  'actualWeight',
  'chargedWeight',
  'rate',
  'freight',
  'value',
  'ewayBillNo',
]

export const BULK_LR_TEMPLATE_KEY = 'tms.bulkLr.templates'
export const BULK_LR_REMEMBER_KEY = 'tms.bulkLr.rememberCommon'
export const DEFAULT_BULK_ROW_COUNT = 6

export const FREIGHT_TYPES = ['To Pay', 'Paid', 'TBB', 'To Be Billed']

export function emptyBulkCommon() {
  return {
    consignorId: '',
    consignor: '',
    consignorPhone: '',
    consignorGst: '',
    consigneeId: '',
    consignee: '',
    consigneePhone: '',
    consigneeGst: '',
    from: '',
    to: '',
    paymentType: 'To Pay',
    vehicle: '',
    driver: '',
    lrDate: new Date().toISOString().slice(0, 10),
    ewayBillNo: '',
    businessType: 'PTL',
    autoCalculate: true,
    autoWeightTotal: true,
    rememberLast: true,
  }
}

export function emptyBulkRow() {
  return {
    id: crypto.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    invoiceNo: '',
    description: '',
    itemId: '',
    packages: '',
    actualWeight: '',
    chargedWeight: '',
    rate: '',
    freight: '',
    value: '',
    ewayBillNo: '',
  }
}

export function createEmptyBulkRows(count = DEFAULT_BULK_ROW_COUNT) {
  return Array.from({ length: count }, () => emptyBulkRow())
}

export function isBulkRowFilled(row) {
  if (!row) return false
  return Boolean(
    String(row.invoiceNo || '').trim()
    || String(row.description || '').trim()
    || Number(row.packages) > 0
    || Number(row.actualWeight) > 0
    || Number(row.chargedWeight) > 0
    || Number(row.freight) > 0,
  )
}

export function computeRowFreight(row, autoCalculate = true) {
  if (!autoCalculate) return Number(row.freight) || 0
  const charged = Number(row.chargedWeight)
  const rate = Number(row.rate)
  if (charged > 0 && rate > 0) {
    return Math.round(charged * rate * 100) / 100
  }
  return Number(row.freight) || 0
}

export function patchBulkRow(row, field, value, autoCalculate = true) {
  const next = { ...row, [field]: value }
  if (field === 'actualWeight' && (next.chargedWeight === '' || next.chargedWeight == null || Number(next.chargedWeight) === 0)) {
    next.chargedWeight = value
  }
  if (['rate', 'chargedWeight', 'actualWeight'].includes(field) && autoCalculate) {
    const freight = computeRowFreight(next, true)
    if (freight > 0 || (Number(next.rate) > 0 && Number(next.chargedWeight) > 0)) {
      next.freight = freight === 0 ? '' : String(freight)
    }
  }
  return next
}

export function summarizeBulkRows(rows, autoCalculate = true) {
  const filled = (rows || []).filter(isBulkRowFilled)
  return filled.reduce(
    (acc, row) => {
      acc.totalLrs += 1
      acc.totalPackages += Number(row.packages) || 0
      acc.totalWeight += Number(row.chargedWeight || row.actualWeight) || 0
      acc.totalFreight += computeRowFreight(row, autoCalculate)
      acc.totalValue += Number(row.value) || 0
      return acc
    },
    { totalLrs: 0, totalPackages: 0, totalWeight: 0, totalFreight: 0, totalValue: 0 },
  )
}

/** Merge common header + one grid row into a full LR entry form, then API payload. */
export function buildBulkLrForm(common, row, remarks = '') {
  const form = emptyLrEntryForm()
  const qty = Number(row.packages) || 0
  const weight = Number(row.chargedWeight || row.actualWeight) || 0
  const freight = computeRowFreight(row, common.autoCalculate !== false)
  const item = {
    ...emptyLrItem(),
    itemId: row.itemId || '',
    description: row.description || '',
    qty,
    weight,
    invoiceNo: row.invoiceNo || '',
    invoiceValue: Number(row.value) || 0,
  }

  return {
    ...form,
    lrDate: common.lrDate || form.lrDate,
    businessType: common.businessType || form.businessType,
    consignorId: common.consignorId || '',
    consignor: common.consignor || '',
    consignorPhone: common.consignorPhone || '',
    consignorGst: common.consignorGst || '',
    consigneeId: common.consigneeId || '',
    consignee: common.consignee || '',
    consigneePhone: common.consigneePhone || '',
    consigneeGst: common.consigneeGst || '',
    billingParty: common.consignor || '',
    billingPartyId: common.consignorId || '',
    customerName: common.consignor || '',
    from: common.from || '',
    to: common.to || '',
    pickupCity: common.from || '',
    vehicle: common.vehicle || '',
    driver: common.driver || '',
    paymentType: common.paymentType || 'To Pay',
    ewayBillNo: row.ewayBillNo || common.ewayBillNo || '',
    material: row.description || '',
    quantity: qty || weight ? `${qty} pkgs / ${weight} kg` : '',
    items: [item],
    freight,
    advance: 0,
    balance: freight,
    remarks: remarks || '',
  }
}

export function buildBulkLrPayload(common, row, remarks = '') {
  return buildLrApiPayload(buildBulkLrForm(common, row, remarks))
}

export function validateBulkCommon(common) {
  const errors = {}
  if (!common.consignorId && !String(common.consignor || '').trim()) {
    errors.consignor = 'Consignor is required.'
  }
  if (!common.consigneeId && !String(common.consignee || '').trim()) {
    errors.consignee = 'Consignee is required.'
  }
  if (!String(common.from || '').trim()) errors.from = 'From is required.'
  if (!String(common.to || '').trim()) errors.to = 'To is required.'
  if (!common.lrDate) errors.lrDate = 'LR Date is required.'
  return errors
}

export function validateBulkRow(row, index) {
  if (!isBulkRowFilled(row)) return null
  if (!String(row.description || '').trim() && !String(row.invoiceNo || '').trim()) {
    return `Row ${index + 1}: Item / Invoice is required.`
  }
  if (!(Number(row.packages) > 0) && !(Number(row.actualWeight) > 0) && !(Number(row.chargedWeight) > 0)) {
    return `Row ${index + 1}: Packages or weight is required.`
  }
  return null
}

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

const CSV_ALIASES = {
  invoiceNo: ['invoice', 'invoice no', 'invoice no.', 'ref', 'ref no', 'invoice/ref', 'invoice no. / ref no.'],
  description: ['item', 'item name', 'description', 'item name / description', 'material'],
  packages: ['packages', 'pkgs', 'pkg', 'packages (no.)', 'qty'],
  actualWeight: ['actual weight', 'actual wt', 'actual weight (kg.)', 'weight'],
  chargedWeight: ['charged weight', 'charged wt', 'charged weight (kg.)'],
  rate: ['rate', 'rate (₹)', 'rate (₹) (per kg.)', 'rate per kg'],
  freight: ['freight', 'freight amount', 'freight amount (₹)'],
  value: ['value', 'value (₹)', 'invoice value'],
  ewayBillNo: ['e-way', 'eway', 'e-way bill', 'e-way bill no.', 'eway bill no'],
}

function mapCsvHeader(header) {
  const key = String(header || '').trim().toLowerCase()
  if (!key) return null
  for (const [field, aliases] of Object.entries(CSV_ALIASES)) {
    if (aliases.includes(key) || key === field.toLowerCase()) return field
  }
  return null
}

/** Parse CSV text into bulk rows (skips blank lines). */
export function parseBulkLrCsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return []

  const headerCells = splitCsvLine(lines[0])
  const mapped = headerCells.map(mapCsvHeader)
  const hasHeader = mapped.some(Boolean)
  const start = hasHeader ? 1 : 0
  const fields = hasHeader
    ? mapped
    : ['invoiceNo', 'description', 'packages', 'actualWeight', 'chargedWeight', 'rate', 'freight', 'value', 'ewayBillNo']

  const rows = []
  for (let i = start; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i])
    if (!cells.some((c) => c)) continue
    const row = emptyBulkRow()
    fields.forEach((field, idx) => {
      if (!field) return
      row[field] = cells[idx] ?? ''
    })
    if (row.actualWeight && !row.chargedWeight) row.chargedWeight = row.actualWeight
    if (!row.freight && Number(row.rate) > 0 && Number(row.chargedWeight) > 0) {
      row.freight = String(computeRowFreight(row, true))
    }
    rows.push(row)
  }
  return rows
}

export function loadBulkTemplates() {
  try {
    const raw = localStorage.getItem(BULK_LR_TEMPLATE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveBulkTemplate(name, common) {
  const templates = loadBulkTemplates().filter((t) => t.name !== name)
  const next = [
    {
      name,
      savedAt: new Date().toISOString(),
      common: {
        ...common,
        // do not persist volatile toggles oddly — keep them
      },
    },
    ...templates,
  ].slice(0, 12)
  localStorage.setItem(BULK_LR_TEMPLATE_KEY, JSON.stringify(next))
  return next
}

export function deleteBulkTemplate(name) {
  const next = loadBulkTemplates().filter((t) => t.name !== name)
  localStorage.setItem(BULK_LR_TEMPLATE_KEY, JSON.stringify(next))
  return next
}

export function loadRememberedCommon() {
  try {
    const raw = localStorage.getItem(BULK_LR_REMEMBER_KEY)
    if (!raw) return null
    return { ...emptyBulkCommon(), ...JSON.parse(raw), lrDate: new Date().toISOString().slice(0, 10) }
  } catch {
    return null
  }
}

export function persistRememberedCommon(common) {
  if (!common?.rememberLast) {
    localStorage.removeItem(BULK_LR_REMEMBER_KEY)
    return
  }
  const {
    autoCalculate, autoWeightTotal, rememberLast, lrDate, ewayBillNo, ...rest
  } = common
  localStorage.setItem(BULK_LR_REMEMBER_KEY, JSON.stringify({
    ...rest,
    autoCalculate,
    autoWeightTotal,
    rememberLast: true,
  }))
}
