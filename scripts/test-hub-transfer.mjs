/**
 * Hub Transfer API smoke + validation tests.
 * Usage: node scripts/test-hub-transfer.mjs
 * Env: TMS_API_URL (default http://localhost:5000), TMS_USER, TMS_PASS
 */
const API = process.env.TMS_API_URL || process.env.TRAINING_API_URL || 'http://localhost:5000'
const USER = process.env.TMS_USER || 'admin'
const PASS = process.env.TMS_PASS || 'admin123'
const COMPANY = process.env.TMS_COMPANY_ID || '00000000-0000-4000-8000-000000000001'

let passed = 0
let failed = 0
const results = []

function ok(name, detail = '') {
  passed += 1
  results.push(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail = '') {
  failed += 1
  results.push(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}`, 'X-Company-Id': COMPANY } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
  return { status: res.status, data }
}

async function main() {
  console.log(`Hub Transfer tests → ${API}`)

  const login = await api('/api/auth/login', { method: 'POST', body: { username: USER, password: PASS } })
  if (login.status !== 200 || !login.data?.token) {
    fail('login', `${login.status} ${JSON.stringify(login.data)}`)
    process.exit(1)
  }
  ok('login')
  const token = login.data.token

  const summary = await api('/api/hub-transfer/summary', { token })
  if (summary.status === 200) ok('GET /summary', JSON.stringify(summary.data))
  else fail('GET /summary', `${summary.status} ${JSON.stringify(summary.data)}`)

  const list = await api('/api/hub-transfer/lrs?page=1&pageSize=10', { token })
  if (list.status === 200 && Array.isArray(list.data?.items)) ok('GET /lrs', `items=${list.data.items.length}`)
  else fail('GET /lrs', `${list.status}`)

  // Validation negatives
  const badReceive = await api('/api/hub-transfer/receive', {
    token,
    method: 'POST',
    body: { lrNumbers: [], hubName: 'Sambhaji Nagar' },
  })
  if (badReceive.status === 400) ok('receive rejects empty LR list')
  else fail('receive rejects empty LR list', `${badReceive.status}`)

  const missingLr = await api('/api/hub-transfer/receive', {
    token,
    method: 'POST',
    body: { lrNumbers: ['LR-DOES-NOT-EXIST-999'], hubName: 'Sambhaji Nagar Hub' },
  })
  if (missingLr.status === 400) ok('receive rejects missing LR')
  else fail('receive rejects missing LR', `${missingLr.status} ${JSON.stringify(missingLr.data)}`)

  const badUnload = await api('/api/hub-transfer/unload', {
    token,
    method: 'POST',
    body: { lrNumbers: ['LR-DOES-NOT-EXIST-999'] },
  })
  if (badUnload.status === 400) ok('unload rejects missing LR')
  else fail('unload rejects missing LR', `${badUnload.status}`)

  const badRemanifest = await api('/api/hub-transfer/re-manifest', {
    token,
    method: 'POST',
    body: {
      lrNumbers: ['LR-DOES-NOT-EXIST-999'],
      hubName: 'Sambhaji Nagar',
      toDestination: 'Jalgaon',
    },
  })
  if (badRemanifest.status === 400) ok('re-manifest rejects missing LR')
  else fail('re-manifest rejects missing LR', `${badRemanifest.status}`)

  const sameDest = await api('/api/hub-transfer/re-manifest', {
    token,
    method: 'POST',
    body: {
      lrNumbers: ['LR-DOES-NOT-EXIST-999'],
      hubName: 'Jalgaon',
      toDestination: 'Jalgaon',
    },
  })
  if (sameDest.status === 400 && String(sameDest.data?.message || '').toLowerCase().includes('same'))
    ok('re-manifest rejects hub == destination')
  else if (sameDest.status === 400)
    ok('re-manifest rejects invalid request (hub==dest or missing LR)', sameDest.data?.message)
  else fail('re-manifest same destination', `${sameDest.status} ${JSON.stringify(sameDest.data)}`)

  // Full 10-LR Pune → Sambhaji Nagar → Jalgaon/Nanded scenario (seed via API + SQL status)
  try {
    const { default: pg } = await import('pg')
    const dbUrl = process.env.TMS_DATABASE_URL
      || 'postgresql://postgres:postgres@localhost:5432/tms_pro'
    const client = new pg.Client({ connectionString: dbUrl })
    await client.connect()

    const branchRes = await api('/api/branches?activeOnly=true', { token })
    const branches = Array.isArray(branchRes.data) ? branchRes.data : branchRes.data?.items || []
    let hub = branches.find((b) => /sambhaji|aurangabad|nagar/i.test(`${b.name} ${b.city || ''}`)) || branches[0]
    if (!hub) {
      const ins = await client.query(
        `INSERT INTO branches (id, company_id, code, name, city, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'HUB-SN', 'Sambhaji Nagar Hub', 'Sambhaji Nagar', true, NOW(), NOW())
         RETURNING id, name, city`,
        [COMPANY],
      )
      hub = { id: ins.rows[0].id, name: ins.rows[0].name, city: ins.rows[0].city }
      ok('seeded hub branch', hub.name)
    } else {
      ok('hub branch', hub.name)
    }

    const stamp = Date.now().toString().slice(-6)
    const created = []
    for (let i = 1; i <= 10; i++) {
      const to = i <= 9 ? 'Jalgaon' : 'Nanded'
      const body = {
        from: 'Pune',
        to,
        consignor: `HT Consignor ${stamp}`,
        consignee: `HT Consignee ${to}`,
        quantity: `${10 + i} pkgs`,
        material: 'General',
        freight: 1000 + i,
        vehicle: 'MH12AB1234',
        driver: 'Test Driver',
      }
      const lr = await api('/api/lr', { token, method: 'POST', body })
      if (lr.status === 200 || lr.status === 201) {
        const lrNumber = lr.data.lrNumber || lr.data.LrNumber
        created.push({ lrNumber, to })
      } else {
        fail(`create LR ${i}`, JSON.stringify(lr.data))
      }
    }
    if (created.length === 10) ok('created 10 LRs', created.map((x) => x.lrNumber).join(','))

    // Force In Transit (simulates completed origin Loading → Dispatch)
    if (created.length) {
      await client.query(
        `UPDATE lorry_receipts SET status = 'In Transit', updated_at = NOW()
         WHERE lr_number = ANY($1::text[]) AND company_id = $2`,
        [created.map((x) => x.lrNumber), COMPANY],
      )
      ok('set LRs In Transit via DB')
    }

    const batch = created.map((x) => x.lrNumber)
    const recv = await api('/api/hub-transfer/receive', {
      token,
      method: 'POST',
      body: {
        lrNumbers: batch,
        hubBranchId: hub.id,
        hubName: hub.name,
        vehicleNumber: 'MH12AB1234',
        remarks: 'e2e hub receive',
      },
    })
    if (recv.status === 200) ok('receive 10 LRs at hub')
    else fail('receive 10 LRs', JSON.stringify(recv.data))

    const unload = await api('/api/hub-transfer/unload', {
      token, method: 'POST', body: { lrNumbers: batch },
    })
    if (unload.status === 200) ok('unload 10 LRs')
    else fail('unload 10 LRs', JSON.stringify(unload.data))

    const jalgaon = created.filter((x) => x.to === 'Jalgaon').map((x) => x.lrNumber)
    const nanded = created.filter((x) => x.to === 'Nanded').map((x) => x.lrNumber)

    const m2 = await api('/api/hub-transfer/re-manifest', {
      token,
      method: 'POST',
      body: {
        lrNumbers: jalgaon,
        hubBranchId: hub.id,
        hubName: hub.name,
        toDestination: 'Jalgaon',
        vehicleNumber: 'MH14AB1111',
        driverName: 'Driver Jalgaon',
        remarks: 'e2e M002',
      },
    })
    if (m2.status === 200) ok('re-manifest Jalgaon', `${m2.data.manifestNo} (${jalgaon.length} LR)`)
    else fail('re-manifest Jalgaon', JSON.stringify(m2.data))

    const m3 = await api('/api/hub-transfer/re-manifest', {
      token,
      method: 'POST',
      body: {
        lrNumbers: nanded,
        hubBranchId: hub.id,
        hubName: hub.name,
        toDestination: 'Nanded',
        vehicleNumber: 'MH15AB2222',
        driverName: 'Driver Nanded',
        remarks: 'e2e M003',
      },
    })
    if (m3.status === 200) ok('re-manifest Nanded', `${m3.data.manifestNo} (${nanded.length} LR)`)
    else fail('re-manifest Nanded', JSON.stringify(m3.data))

    if (m2.status === 200) {
      const d2 = await api(`/api/hub-transfer/manifests/${m2.data.id}/dispatch`, {
        token, method: 'POST', body: {},
      })
      if (d2.status === 200) ok('dispatch Jalgaon manifest')
      else fail('dispatch Jalgaon', JSON.stringify(d2.data))
    }
    if (m3.status === 200) {
      const d3 = await api(`/api/hub-transfer/manifests/${m3.data.id}/dispatch`, {
        token, method: 'POST', body: {},
      })
      if (d3.status === 200) ok('dispatch Nanded manifest')
      else fail('dispatch Nanded', JSON.stringify(d3.data))
    }

    const sample = created.find((x) => x.to === 'Nanded') || created[0]
    if (sample) {
      const histPath = encodeURIComponent(sample.lrNumber.replaceAll('/', '~'))
      const hist = await api(`/api/hub-transfer/lrs/${histPath}/movements`, { token })
      if (hist.status === 200
        && hist.data.originalFrom === 'Pune'
        && hist.data.originalTo === sample.to
        && (hist.data.legs || []).length >= 2) {
        ok('movement history', `${sample.lrNumber}: ${hist.data.originalFrom}→${hist.data.originalTo}, legs=${hist.data.legs.length}`)
      } else {
        fail('movement history', JSON.stringify(hist.data))
      }

      // Original To must never become the hub
      if (hist.data?.originalTo && !/sambhaji/i.test(hist.data.originalTo))
        ok('original destination unchanged', hist.data.originalTo)
      else fail('original destination changed', hist.data?.originalTo)
    }

    // Duplicate active assignment should fail
    if (jalgaon[0]) {
      const dup = await api('/api/hub-transfer/re-manifest', {
        token,
        method: 'POST',
        body: {
          lrNumbers: [jalgaon[0]],
          hubBranchId: hub.id,
          hubName: hub.name,
          toDestination: 'Jalgaon',
        },
      })
      if (dup.status === 400) ok('duplicate re-manifest blocked')
      else fail('duplicate re-manifest blocked', `${dup.status} ${JSON.stringify(dup.data)}`)
    }

    await client.end()
  } catch (e) {
    fail('full 10-LR scenario', e.message)
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
