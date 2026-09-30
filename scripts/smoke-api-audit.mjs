/**
 * Live API smoke audit against running TMS API.
 * Usage: node scripts/smoke-api-audit.mjs
 */
import fs from 'fs'
const BASE = process.env.TMS_API || 'http://localhost:5000'

const results = []

function record(area, name, ok, detail = '', severity = ok ? 'Pass' : 'Fail') {
  results.push({ area, name, ok, detail: String(detail).slice(0, 300), severity })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${area} :: ${name}${detail ? ` — ${String(detail).slice(0, 120)}` : ''}`)
}

async function req(method, path, { token, body, expectStatus, companyId } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (companyId) headers['X-Company-Id'] = companyId
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (expectStatus != null && res.status !== expectStatus) {
    const err = new Error(`HTTP ${res.status} expected ${expectStatus}: ${text.slice(0, 200)}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return { status: res.status, data }
}

async function main() {
  // Health
  try {
    const h = await req('GET', '/api/health')
    record('Core', 'GET /api/health', h.status === 200 && h.data?.database === 'connected', JSON.stringify(h.data?.status))
  } catch (e) {
    record('Core', 'GET /api/health', false, e.message, 'Critical')
    process.exitCode = 1
    return finish()
  }

  // Auth negative
  try {
    const bad = await req('POST', '/api/auth/login', { body: { username: 'admin', password: 'wrong' } })
    record('Auth', 'Login invalid password rejected', bad.status === 401 || bad.status === 400, `status=${bad.status}`)
  } catch (e) {
    record('Auth', 'Login invalid password rejected', e.status === 401 || e.status === 400, e.message)
  }

  let token
  let companyId
  try {
    const login = await req('POST', '/api/auth/login', {
      body: { username: 'admin', password: 'admin123' },
      expectStatus: 200,
    })
    token = login.data?.token
    record('Auth', 'Login admin/admin123', !!token, login.data?.role)
  } catch (e) {
    record('Auth', 'Login admin/admin123', false, e.message, 'Critical')
    process.exitCode = 1
    return finish()
  }

  // Unauthorized
  try {
    const u = await req('GET', '/api/customers?pageSize=1')
    record('Auth', 'Customers without token rejected', u.status === 401, `status=${u.status}`)
  } catch (e) {
    record('Auth', 'Customers without token rejected', e.status === 401, e.message)
  }

  // Platform admin requires company scope
  try {
    const noCo = await req('GET', '/api/customers?pageSize=1', { token })
    record('Auth', 'Platform admin without X-Company-Id → 403', noCo.status === 403, noCo.data?.message || `status=${noCo.status}`)
  } catch (e) {
    record('Auth', 'Platform admin without X-Company-Id → 403', e.status === 403, e.message)
  }

  try {
    const cos = await req('GET', '/api/platform/companies', { token, expectStatus: 200 })
    const rows = cos.data?.rows || cos.data?.items || cos.data || []
    companyId = rows.find((c) => c.name === 'DEMO')?.id || rows[0]?.id
    record('Platform', 'List companies', !!companyId, companyId)
  } catch (e) {
    record('Platform', 'List companies', false, e.message, 'Critical')
    process.exitCode = 1
    return finish()
  }

  const getList = async (area, path) => {
    try {
      const r = await req('GET', path, { token, companyId })
      const items = r.data?.items ?? (Array.isArray(r.data) ? r.data : null)
      const ok = r.status === 200
      const detail = ok
        ? (items ? `count~${Array.isArray(items) ? items.length : '?'} total=${r.data?.total ?? 'n/a'}` : `keys=${Object.keys(r.data || {}).slice(0, 6).join(',')}`)
        : `status=${r.status} ${JSON.stringify(r.data).slice(0, 120)}`
      record(area, `GET ${path}`, ok, detail)
      return r.data
    } catch (e) {
      record(area, `GET ${path}`, false, e.message)
      return null
    }
  }

  await getList('Masters', '/api/customers?pageSize=5')
  await getList('Masters', '/api/vendors?pageSize=5')
  await getList('Masters', '/api/consignors?pageSize=5&status=Active')
  await getList('Masters', '/api/consignees?pageSize=5&status=Active')
  await getList('Masters', '/api/vehicles?pageSize=5')
  await getList('Masters', '/api/drivers?pageSize=5')
  await getList('Masters', '/api/items?pageSize=5')
  await getList('Masters', '/api/branches')
  await getList('Masters', '/api/freight-rates?pageSize=5')

  await getList('Transactions', '/api/bookings?pageSize=5')
  await getList('Transactions', '/api/lr?pageSize=5')
  await getList('Transactions', '/api/expenses?pageSize=5')
  await getList('Billing', '/api/freight-invoices?pageSize=5')

  await getList('Accounting', '/api/accounting/ledger-master?pageSize=20')
  await getList('Accounting', '/api/accounting/chart-of-accounts')
  await getList('Accounting', '/api/accounting/trial-balance')
  await getList('Accounting', '/api/accounting/outstanding')
  await getList('Accounting', '/api/gl/vouchers')
  await getList('Accounting', '/api/gl/settings')
  await getList('Accounting', '/api/gl/posting-maps')

  await getList('GST', '/api/accounting/gst')
  await getList('GST', '/api/gl/compliance/gstr1')
  await getList('GST', '/api/gl/compliance/gstr3b')

  await getList('TDS', '/api/tds/settings')
  await getList('TDS', '/api/tds/sections')
  await getList('TDS', '/api/tds/rates')
  await getList('TDS', '/api/tds/transactions?pageSize=5')
  await getList('TDS', '/api/gl/compliance/form26q')

  await getList('HR', '/api/hr/employees?pageSize=5')
  await getList('Payroll', '/api/payroll/runs?pageSize=5')
  await getList('Reports', '/api/reports/lr-movement?pageSize=5')
  await getList('Dashboard', '/api/dashboard/home')
  await getList('Dashboard', '/api/dashboard/overview')
  await getList('Dashboard', '/api/dashboard/stats')

  // Negative: invalid id
  try {
    const r = await req('GET', '/api/customers/00000000-0000-0000-0000-000000000000', { token, companyId })
    record('Negative', 'Customer missing GUID → 404', r.status === 404, `status=${r.status}`)
  } catch (e) {
    record('Negative', 'Customer missing GUID → 404', e.status === 404, e.message)
  }

  // Negative: unbalanced journal should fail
  try {
    const r = await req('POST', '/api/gl/journals', {
      token,
      companyId,
      body: {
        voucherType: 'Journal',
        transactionDate: new Date().toISOString().slice(0, 10),
        narration: 'smoke unbalanced',
        asDraft: false,
        lines: [
          { ledgerAccountId: '00000000-0000-0000-0000-000000000001', ledgerName: 'A', debit: 100, credit: 0 },
          { ledgerAccountId: '00000000-0000-0000-0000-000000000002', ledgerName: 'B', debit: 0, credit: 50 },
        ],
      },
    })
    record('Accounting', 'Unbalanced journal rejected', r.status >= 400, `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)
  } catch (e) {
    record('Accounting', 'Unbalanced journal rejected', e.status >= 400, e.message)
  }

  // Expense categories
  try {
    const r = await req('GET', '/api/expenses/categories', { token, companyId })
    record('Expenses', 'GET /api/expenses/categories', r.status === 200, JSON.stringify(r.data).slice(0, 100))
  } catch (e) {
    record('Expenses', 'GET /api/expenses/categories', false, e.message)
  }

  return finish()
}

function finish() {
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  const out = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    summary: { total: results.length, passed, failed },
    results,
  }
  fsWrite(out)
  console.log(`\nSUMMARY ${passed}/${results.length} passed, ${failed} failed`)
  if (failed) process.exitCode = 1
}

function fsWrite(out) {
  fs.writeFileSync('scripts/smoke-api-audit-results.json', JSON.stringify(out, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
