/**
 * TMS Pro API performance benchmark
 * Usage: node scripts/perf-benchmark.mjs [--api http://localhost:5000/api] [--runs 5]
 *
 * Prerequisites: backend running, perf data seeded (database/perf/seed_bulk.sql)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const apiBase = args.includes('--api') ? args[args.indexOf('--api') + 1] : 'http://localhost:5000/api'
const runs = args.includes('--runs') ? Number(args[args.indexOf('--runs') + 1]) : 5
const THRESHOLD_MS = 2000
const WARN_MS = 500

const endpoints = [
  { section: 'Bookings', name: 'List (paginated p1)', path: '/bookings?page=1&pageSize=50' },
  { section: 'Bookings', name: 'List (paginated p100)', path: '/bookings?page=100&pageSize=50' },
  { section: 'Bookings', name: 'Search customer', path: '/bookings?page=1&pageSize=50&search=Perf' },
  { section: 'Customers', name: 'List (paginated)', path: '/customers?page=1&pageSize=50' },
  { section: 'Vehicles', name: 'List (paginated)', path: '/vehicles?page=1&pageSize=50' },
  { section: 'Drivers', name: 'List (paginated)', path: '/drivers?page=1&pageSize=50' },
  { section: 'Vendors', name: 'List (paginated)', path: '/vendors?page=1&pageSize=50' },
  { section: 'Expenses', name: 'List (paginated)', path: '/expenses?page=1&pageSize=50' },
  { section: 'LR', name: 'List (paginated)', path: '/lr?page=1&pageSize=50' },
  { section: 'Dashboard', name: 'Stats (aggregates)', path: '/dashboard/stats' },
  { section: 'Dashboard', name: 'Monthly revenue chart', path: '/dashboard/charts/monthly-revenue' },
  { section: 'Dashboard', name: 'Trip analysis', path: '/dashboard/charts/trip-analysis' },
  { section: 'Dashboard', name: 'Alerts', path: '/dashboard/alerts' },
  { section: 'Reports', name: 'Trips report', path: '/reports/trips' },
  { section: 'Reports', name: 'Income report', path: '/reports/income' },
  { section: 'Reports', name: 'Cash flow', path: '/reports/cash-flow' },
  { section: 'Accounting', name: 'Sales register', path: '/accounting/sales-register' },
  { section: 'Accounting', name: 'Trial balance', path: '/accounting/trial-balance' },
]

async function login() {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  const data = await res.json()
  return data.token
}

async function timedGet(token, path) {
  const start = performance.now()
  const res = await fetch(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const body = await res.text()
  const ms = performance.now() - start
  const sizeKb = Math.round(body.length / 1024)
  let itemCount = null
  try {
    const json = JSON.parse(body)
    if (json.items) itemCount = json.items.length
    else if (Array.isArray(json)) itemCount = json.length
  } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, ms, sizeKb, itemCount }
}

function status(ms, ok) {
  if (!ok) return 'FAIL'
  if (ms >= THRESHOLD_MS) return 'CRITICAL'
  if (ms >= WARN_MS) return 'WARN'
  return 'OK'
}

async function main() {
  console.log(`TMS Pro Performance Benchmark`)
  console.log(`API: ${apiBase} | Runs: ${runs}\n`)

  let token
  try {
    token = await login()
    console.log('Login: OK\n')
  } catch (e) {
    console.error('Cannot login. Start backend: cd backend/Tms.Api && dotnet run')
    console.error(e.message)
    process.exit(1)
  }

  const results = []

  for (const ep of endpoints) {
    const timings = []
    let last = null
    for (let i = 0; i < runs; i++) {
      last = await timedGet(token, ep.path)
      if (last.ok) timings.push(last.ms)
    }
    const avg = timings.length ? timings.reduce((a, b) => a + b, 0) / timings.length : 0
    const min = timings.length ? Math.min(...timings) : 0
    const max = timings.length ? Math.max(...timings) : 0
    results.push({
      section: ep.section,
      name: ep.name,
      path: ep.path,
      avgMs: Math.round(avg),
      minMs: Math.round(min),
      maxMs: Math.round(max),
      sizeKb: last?.sizeKb ?? 0,
      items: last?.itemCount,
      status: status(avg, last?.ok),
    })
    const icon = results.at(-1).status === 'OK' ? '✓' : results.at(-1).status === 'WARN' ? '!' : '✗'
    console.log(`${icon} [${ep.section}] ${ep.name}: avg ${Math.round(avg)}ms (min ${Math.round(min)} / max ${Math.round(max)}) | ${last?.sizeKb}KB`)
  }

  const reportPath = path.join(__dirname, '..', 'docs', 'perf_report.json')
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), apiBase, runs, results }, null, 2),
  )

  console.log(`\n--- Summary ---`)
  const critical = results.filter((r) => r.status === 'CRITICAL' || r.status === 'FAIL')
  const warn = results.filter((r) => r.status === 'WARN')
  console.log(`OK: ${results.filter((r) => r.status === 'OK').length}`)
  console.log(`WARN (>${WARN_MS}ms): ${warn.length}`)
  console.log(`CRITICAL/FAIL (>${THRESHOLD_MS}ms): ${critical.length}`)
  if (critical.length) {
    console.log('\nNeeds optimization:')
    critical.forEach((r) => console.log(`  - ${r.name} (${r.avgMs}ms) ${r.path}`))
  }
  console.log(`\nReport saved: ${reportPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
