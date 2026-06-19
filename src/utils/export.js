export function exportToCsv(rows, columns, filename = 'export.csv') {
  if (!rows?.length) return false
  const cols = columns.filter((c) => c.key && c.key !== 'actions')
  const header = cols.map((c) => `"${(c.label ?? c.key).replace(/"/g, '""')}"`).join(',')
  const body = rows
    .map((row) =>
      cols
        .map((c) => {
          const raw = c.exportValue ? c.exportValue(row) : row[c.key]
          const val = raw == null ? '' : String(raw).replace(/"/g, '""')
          return `"${val}"`
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(a)
  return true
}

export function exportJson(data, filename = 'export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(a)
}

export function formatChange(current, previous) {
  if (!previous) return { text: '—', positive: true }
  const pct = ((current - previous) / previous) * 100
  const positive = pct >= 0
  return { text: `${positive ? '+' : ''}${pct.toFixed(1)}%`, positive }
}
