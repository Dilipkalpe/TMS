/** Human-readable labels for common API / validation field names. */
const FIELD_LABELS = {
  employeeCode: 'Employee code',
  name: 'Name',
  employeeType: 'Employee type',
  employmentType: 'Employment type',
  phone: 'Phone',
  email: 'Email',
  key: 'Setting key',
  value: 'Value',
  username: 'Username',
  password: 'Password',
  customerId: 'Customer',
  fromCity: 'From city',
  toCity: 'To city',
  bookingDate: 'Booking date',
  vehicleNo: 'Vehicle number',
  amount: 'Amount',
  category: 'Category',
  pin: 'PIN',
  dateOfJoining: 'Date of joining',
  dateOfBirth: 'Date of birth',
  contractEndDate: 'Contract end date',
  licenseExpiry: 'License expiry',
  branchCode: 'Branch code',
  companyName: 'Company name',
}

/**
 * Turn ASP.NET / ProblemDetails validation payload into a user-readable message.
 * Handles: { message }, { Message }, { errors: { field: [] } }, { title, detail }.
 */
export function formatApiErrorBody(err) {
  if (!err || typeof err !== 'object') return null

  const direct = err.message || err.Message
  if (direct && typeof direct === 'string' && direct.trim()) {
    return humanizeRawApiMessage(direct.trim())
  }

  if (err.errors && typeof err.errors === 'object') {
    const lines = []
    for (const [field, msgs] of Object.entries(err.errors)) {
      const parts = Array.isArray(msgs) ? msgs : [msgs]
      for (const part of parts) {
        const text = String(part ?? '').trim()
        if (text.includes('could not be converted') && text.includes('Path:')) {
          const field = text.match(/Path:\s*\$\.(\w+)/i)?.[1]
          if (field) {
            lines.push(`${friendlyFieldName(field)}: invalid or missing value`)
            continue
          }
        }
        const label = friendlyFieldName(field)
        if (!field || field === '$' || field === 'request') {
          lines.push(text)
        } else if (text.toLowerCase().includes(label.toLowerCase())) {
          lines.push(text)
        } else {
          lines.push(`${label}: ${text}`)
        }
      }
    }
    if (lines.length) return [...new Set(lines)].join('\n')
  }

  if (err.detail && typeof err.detail === 'string' && err.detail.trim()) {
    return err.detail.trim()
  }

  const title = err.title
  if (title && typeof title === 'string' && title.trim()
    && title !== 'One or more validation errors occurred.') {
    return title.trim()
  }

  return null
}

function humanizeRawApiMessage(text) {
  const lines = []
  if (text.includes('could not be converted') && text.includes('Path:')) {
    const match = text.match(/Path:\s*\$\.(\w+)/i)
    if (match) lines.push(`${friendlyFieldName(match[1])}: invalid or missing value`)
  }
  const required = [...text.matchAll(/The (\w+) field is required/gi)]
  for (const [, field] of required) {
    lines.push(`${friendlyFieldName(field)}: required`)
  }
  if (lines.length) return [...new Set(lines)].join('\n')
  if (text.startsWith('The body field is required')) {
    return 'Please check required fields and date formats, then try again.'
  }
  return text
}

export function friendlyFieldName(field) {
  const raw = String(field ?? '')
    .replace(/^\$\.?/, '')
    .replace(/^body\./i, '')
    .replace(/\[\d+\]/g, '')

  if (FIELD_LABELS[raw]) return FIELD_LABELS[raw]

  const camel = raw.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
  if (!camel) return 'Field'
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/** Read message from ApiError or unknown thrown values. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  if (typeof error === 'string') return error
  return error.message || fallback
}

/** Strip empty/null fields so optional dates never break API model binding. */
export function sanitizeApiBody(value) {
  if (value === '' || value == null) return undefined
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map(sanitizeApiBody).filter((v) => v !== undefined)
  }
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    const cleaned = sanitizeApiBody(v)
    if (cleaned !== undefined) out[k] = cleaned
  }
  return out
}
