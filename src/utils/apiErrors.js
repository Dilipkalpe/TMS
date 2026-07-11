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
  month: 'Month',
  year: 'Year',
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
  if (direct && typeof direct === 'string' && direct.trim()) return direct.trim()

  if (err.errors && typeof err.errors === 'object') {
    const lines = []
    for (const [field, msgs] of Object.entries(err.errors)) {
      const parts = Array.isArray(msgs) ? msgs : [msgs]
      for (const part of parts) {
        const text = String(part ?? '').trim()
        if (!text) continue
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
