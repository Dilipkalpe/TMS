import fs from 'fs'

const raw = fs.readFileSync('scripts/routes-extracted.json', 'utf8').replace(/^\uFEFF/, '')
const { routes } = JSON.parse(raw)

const moduleOf = (path) => {
  const p = path.replace(/^\//, '')
  if (p.startsWith('login') || p === '/login') return 'Auth'
  if (p.startsWith('portal')) return 'Customer Portal'
  if (p.startsWith('driver')) return 'Driver Portal'
  if (p.startsWith('bookings') || p.includes('quotations') || p === 'pending' || p === 'confirmed' || p === 'cancelled') return 'Bookings'
  if (p.startsWith('lr')) return 'LR / Operations Workflow'
  if (p.startsWith('shipment') || p.includes('hub-transfer')) return 'Shipment'
  if (p.startsWith('delivery-management')) return 'Delivery'
  if (p.startsWith('operations')) return 'Operations'
  if (p.startsWith('vehicles') || p === 'maintenance') return 'Fleet'
  if (p.startsWith('drivers')) return 'Drivers'
  if (p.startsWith('customers')) return 'Customers'
  if (p.startsWith('vendors')) return 'Vendors'
  if (p.startsWith('consignors')) return 'Consignors'
  if (p.startsWith('consignees')) return 'Consignees'
  if (p.startsWith('items')) return 'Items'
  if (p.startsWith('freight-rates')) return 'Freight Rates'
  if (p.startsWith('expenses')) return 'Expenses'
  if (p.startsWith('payroll')) return 'Payroll'
  if (p.startsWith('hr')) return 'HR'
  if (p.startsWith('accounting/tds')) return 'Accounting / TDS'
  if (p.startsWith('accounting/gl')) return 'Accounting / GL'
  if (p.startsWith('accounting')) return 'Accounting'
  if (p.startsWith('reports')) return 'Reports'
  if (p.startsWith('settings')) return 'Settings'
  if (p.startsWith('platform')) return 'Platform'
  if (p.startsWith('masters')) return 'Masters'
  if (p === '(index under parent)' || p === '' || p === '*') return 'Core'
  return 'Other'
}

const crudGuess = (comp, path) => {
  const c = (comp || '').toLowerCase()
  const p = (path || '').toLowerCase()
  if (c.includes('navigate') || c.includes('hub') || c.includes('layout') || c.includes('redirect')) return 'N/A (nav/hub)'
  if (p.includes('/new') || c.startsWith('new')) return 'C (create)'
  if (p.includes('/edit') || c.startsWith('edit')) return 'U (edit)'
  if (c.includes('list') || c.includes('tab') || c.includes('register') || c.includes('report')) return 'R (list/search/filter)'
  if (c.includes('details') || c.includes('view') || c.includes('page')) return 'R/U'
  return 'R'
}

const accountingImpact = (path, module) => {
  if (module.startsWith('Accounting')) return 'Direct GL/TDS/GST'
  if (path.includes('billing') || path.includes('freight-invoice') || path.includes('payment') || path.includes('expense') || path.includes('payroll')) return 'Auto-post when AutoPostOps'
  if (module === 'Bookings' || module.startsWith('LR')) return 'Indirect (billing/expense later)'
  return 'None / ops only'
}

const absPath = (path, i, all) => {
  if (path.startsWith('/')) return path
  if (path === '(index under parent)') {
    // find previous absolute parent
    for (let j = i - 1; j >= 0; j--) {
      if (all[j].path.startsWith('/')) return all[j].path
      if (!all[j].path.includes(':') && !all[j].component.includes('Navigate') && all[j].path.split('/').length <= 2) {
        // weak heuristic
      }
    }
    return '(nested index)'
  }
  // nest under last top-level style
  return `/${path}`
}

let lines = []
lines.push('# TESTING_PAGE_INVENTORY')
lines.push('')
lines.push('Generated from `src/App.jsx` route table. **Do not treat Status as full E2E pass** — see Status legend.')
lines.push('')
lines.push(`- **Generated:** ${new Date().toISOString().slice(0, 10)}`)
lines.push(`- **Route entries extracted:** ${routes.length}`)
lines.push('- **Primary sources:** `src/App.jsx`, page components under `src/pages/**`')
lines.push('')
lines.push('## Status legend')
lines.push('')
lines.push('| Status | Meaning |')
lines.push('| ------ | ------- |')
lines.push('| INVENTORIED | Page/route discovered; not yet runtime-tested in this run |')
lines.push('| AUTOMATED | Covered by unit/integration tests (see COMPLETE report) |')
lines.push('| CODE_REVIEW | Static code/API wiring reviewed |')
lines.push('| NOT_EXECUTED_ENV | UI/browser/DB live test blocked (API/Vite/DB not available in session) |')
lines.push('| REDIRECT | Navigate wrapper only |')
lines.push('')
lines.push('## Inventory')
lines.push('')
lines.push('| Sr No | Module | Page | URL/Route | Functionality | CRUD | API | Database | Accounting Impact | Status |')
lines.push('| ----- | ------ | ---- | --------- | ------------- | ---- | --- | -------- | ----------------- | ------ |')

routes.forEach((r, idx) => {
  const mod = moduleOf(r.path)
  const url = absPath(r.path, idx, routes)
  const isRedirect = String(r.component).startsWith('Navigate')
  const status = isRedirect ? 'REDIRECT' : 'INVENTORIED / NOT_EXECUTED_ENV'
  const crud = crudGuess(r.component, r.path)
  const acct = accountingImpact(r.path, mod)
  const api = isRedirect ? '—' : 'via `src/services/api.js` clients'
  const db = isRedirect ? '—' : 'PostgreSQL via API'
  const func = isRedirect ? r.component : `${r.component} screen`
  lines.push(`| ${idx + 1} | ${mod} | ${r.component} | \`${url}\` | ${func} | ${crud} | ${api} | ${db} | ${acct} | ${status} |`)
})

lines.push('')
lines.push('## Module counts')
lines.push('')
const counts = {}
routes.forEach((r) => {
  const m = moduleOf(r.path)
  counts[m] = (counts[m] || 0) + 1
})
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([m, c]) => {
  lines.push(`- **${m}:** ${c}`)
})

lines.push('')
lines.push('## Notes')
lines.push('')
lines.push('- Nested booking tabs (`/bookings/pending|confirmed|cancelled|quotations`) share `BookingManagementLayout`.')
lines.push('- Many `/lr/*` status URLs are redirects into `/lr?status=…` (LR list KPI filters).')
lines.push('- Portal and Driver apps have separate auth providers.')
lines.push('- Platform hub may expose additional company/tenant admin screens loaded inside the hub component.')
lines.push('')

fs.writeFileSync('TESTING_PAGE_INVENTORY.md', lines.join('\n'), 'utf8')
console.log('Wrote TESTING_PAGE_INVENTORY.md', routes.length, 'rows')
