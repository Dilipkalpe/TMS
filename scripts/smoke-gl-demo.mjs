const BASE = 'http://localhost:5000'
const login = await (await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
})).json()
const cos = await (await fetch(`${BASE}/api/platform/companies`, {
  headers: { Authorization: `Bearer ${login.token}` },
})).json()
const co = cos.rows.find((c) => c.name === 'Demo Company').id
const h = { Authorization: `Bearer ${login.token}`, 'X-Company-Id': co }
const tb = await (await fetch(`${BASE}/api/accounting/trial-balance`, { headers: h })).json()
console.log(JSON.stringify({
  source: tb.source,
  totalDebit: tb.totalDebit,
  totalCredit: tb.totalCredit,
  balanced: Number(tb.totalDebit) === Number(tb.totalCredit),
  rows: (tb.rows || []).length,
}, null, 2))
const gl = await (await fetch(`${BASE}/api/gl/settings`, { headers: h })).json()
console.log('settings', { autoPostOps: gl.autoPostOps, glReportsEnabled: gl.glReportsEnabled })
const inv = await (await fetch(`${BASE}/api/freight-invoices?pageSize=5`, { headers: h })).json()
console.log('invoices total', inv.total, 'sample', (inv.items || []).map((i) => ({
  no: i.invoiceNo, total: i.totalAmount, bal: i.balance ?? i.outstanding, status: i.status,
})))
const vouchers = await (await fetch(`${BASE}/api/gl/vouchers`, { headers: h })).json()
const vlist = Array.isArray(vouchers) ? vouchers : (vouchers.items || [])
console.log('vouchers', vlist.length, vlist[0] || null)
