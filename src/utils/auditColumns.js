/** Standard audit columns for list/grid screens (CBy / CDate / MBy / MDate). */

/** Display date only as DD-MM-YYYY (no time). DB timestamps stay unchanged. */
function formatAuditDate(value) {
  if (value == null || value === '') return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    const s = String(value)
    // Accept ISO / yyyy-mm-dd prefixes
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[3]}-${m[2]}-${m[1]}`
    return s.length >= 10 ? s.slice(0, 10) : s
  }
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy}`
}

export const AUDIT_COLUMNS = [
  { key: 'createdBy', label: 'CBy', width: 'w-20', nowrap: true, render: (r) => r.createdBy || '—' },
  { key: 'createdAt', label: 'CDate', width: 'w-24', nowrap: true, render: (r) => formatAuditDate(r.createdAt) },
  { key: 'updatedBy', label: 'MBy', width: 'w-20', nowrap: true, render: (r) => r.updatedBy || '—' },
  { key: 'updatedAt', label: 'MDate', width: 'w-24', nowrap: true, render: (r) => formatAuditDate(r.updatedAt) },
]

/** Append standard audit columns to a list column definition. */
export function withAuditColumns(columns = []) {
  return [...columns, ...AUDIT_COLUMNS]
}
