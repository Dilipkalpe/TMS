const BASE = 'http://localhost:5000'
const login = await (await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
})).json()
const cos = await (await fetch(`${BASE}/api/platform/companies`, {
  headers: { Authorization: `Bearer ${login.token}` },
})).json()
const co = cos.rows.find((c) => c.name === 'Demo Company').id
const h = {
  Authorization: `Bearer ${login.token}`,
  'X-Company-Id': co,
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

async function post(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: h })
  const t = await r.text()
  let d; try { d = JSON.parse(t) } catch { d = t }
  console.log('POST', path, r.status, JSON.stringify(d).slice(0, 800))
  return d
}

await post('/api/gl/migration/run')
await post('/api/gl/reconciliation/run')
const findings = await (await fetch(`${BASE}/api/gl/reconciliation/findings`, { headers: h })).json()
console.log('findings', JSON.stringify(findings).slice(0, 1500))
const tb = await (await fetch(`${BASE}/api/accounting/trial-balance`, { headers: h })).json()
console.log('TB after', { totalDebit: tb.totalDebit, totalCredit: tb.totalCredit, balanced: tb.totalDebit === tb.totalCredit })
