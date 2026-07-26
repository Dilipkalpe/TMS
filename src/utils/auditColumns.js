/** Standard audit columns for list/grid screens (CBy / CDate / ModBy / ModDate). */

function formatAuditDate(value) {
  if (value == null || value === '') return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    const s = String(value)
    return s.length >= 10 ? s.slice(0, 10) : s
  }
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

export const AUDIT_COLUMNS = [
  { key: 'createdBy', label: 'CBy', render: (r) => r.createdBy || '—' },
  { key: 'createdAt', label: 'CDate', render: (r) => formatAuditDate(r.createdAt) },
  { key: 'updatedBy', label: 'ModBy', render: (r) => r.updatedBy || '—' },
  { key: 'updatedAt', label: 'ModDate', render: (r) => formatAuditDate(r.updatedAt) },
]

/** Append standard audit columns to a list column definition. */
export function withAuditColumns(columns = []) {
  return [...columns, ...AUDIT_COLUMNS]
}
