import { formatCurrency } from '../components/ui/ReportFilters'

const CURRENCY_KEYS = /amount|freight|gst|total|debit|credit|balance|expense|profit|revenue|advance|hamali|insurance|charges/i

export function getCellValue(col, row) {
  if (col.printValue) return col.printValue(row)
  if (col.exportValue) return col.exportValue(row)
  const raw = row[col.key]
  if (raw == null) return ''
  if (typeof raw === 'object') return ''
  if (typeof raw === 'number' && CURRENCY_KEYS.test(col.key)) {
    return formatCurrency(raw)
  }
  if (typeof raw === 'number') return String(raw)
  return String(raw)
}

export function formatPrintDate(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value ?? '')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatPrintDateTime(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value ?? '')
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPrintCurrency(amount) {
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  if (Number.isNaN(n)) return String(amount)
  return formatCurrency(n)
}

export function lrTotalCharges(lr) {
  return Number(lr.freight || 0)
    + Number(lr.gst || 0)
    + Number(lr.hamali || 0)
    + Number(lr.loadingCharges || 0)
    + Number(lr.unloadingCharges || 0)
    + Number(lr.insurance || 0)
}

export const DEFAULT_COMPANY = {
  companyName: 'TMS Pro Transport',
  address: '',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
}
