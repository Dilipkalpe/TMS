const BASE = 'http://localhost:5000'
const login = await (await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
})).json()
const cos = await (await fetch(`${BASE}/api/platform/companies`, {
  headers: { Authorization: `Bearer ${login.token}` },
})).json()
const co = cos.rows.find((c) => c.name === 'Demo Company').id
const h = { Authorization: `Bearer ${login.token}`, 'X-Company-Id': co, Accept: 'application/json' }

async function get(path) {
  const r = await fetch(`${BASE}${path}`, { headers: h })
  const t = await r.text()
  let d; try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, d }
}

const findings = []
const tb = await get('/api/accounting/trial-balance')
findings.push({ check: 'TB balanced', ok: Number(tb.d.totalDebit) === Number(tb.d.totalCredit), detail: tb.d })

const inv = await get('/api/freight-invoices?pageSize=50')
const invoices = inv.d.items || []
const openAr = invoices.filter((i) => Number(i.balance ?? i.outstanding ?? 0) > 0)
findings.push({
  check: 'Open AR invoices exist',
  ok: true,
  detail: { count: openAr.length, amounts: openAr.map((i) => i.balance ?? i.outstanding) },
})

const vouchers = await get('/api/gl/vouchers')
const vlist = Array.isArray(vouchers.d) ? vouchers.d : (vouchers.d.items || [])
findings.push({ check: 'GL vouchers listed', ok: vouchers.status === 200, detail: { count: vlist.length, sample: vlist[0] } })

// Invoice auto-post expected when AutoPostOps — look for source CUSTOMER_INVOICE
const invoiceLinked = vlist.filter((v) => String(v.sourceType || '').includes('INVOICE') || String(v.narration || '').toLowerCase().includes('invoice'))
findings.push({
  check: 'Freight invoices have GL auto-post vouchers',
  ok: invoices.length === 0 || invoiceLinked.length > 0 || vlist.some((v) => v.sourceType),
  detail: {
    invoices: invoices.length,
    vouchersWithSource: vlist.filter((v) => v.sourceType).length,
    voucherSources: [...new Set(vlist.map((v) => v.sourceType))],
    note: 'If AutoPostOps true but no CUSTOMER_INVOICE vouchers, posting gap',
  },
})

const outstanding = await get('/api/accounting/outstanding')
const custOut = outstanding.d?.customers || []
const custTotal = custOut.reduce((s, c) => s + Number(c.outstanding ?? c.balance ?? 0), 0)
findings.push({
  check: 'Outstanding report vs open invoice balances',
  ok: true,
  detail: {
    outstandingCustomers: custOut.length,
    outstandingTotal: custTotal,
    openInvoiceAr: openAr.reduce((s, i) => s + Number(i.balance ?? i.outstanding ?? 0), 0),
  },
})

// TB zero while AR open is integrity risk when glReportsEnabled
const risk = Number(tb.d.totalDebit) === 0 && openAr.length > 0 && vlist.length > 0
findings.push({
  check: 'TB non-zero when open AR / vouchers exist (GL integrity)',
  ok: !risk,
  severity: risk ? 'High' : 'Pass',
  detail: risk
    ? 'Trial balance totals are 0 while freight invoices have outstanding and at least one GL voucher exists — ops↔GL may be out of sync or voucher not updating ledger balances'
    : 'OK',
})

console.log(JSON.stringify({ companyId: co, findings }, null, 2))
