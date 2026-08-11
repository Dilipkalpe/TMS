import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input, { Select } from '../../components/ui/Input'
import { ewayBillsApi, lrApi, unwrapList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { lrDetailPath } from '../../utils/docPath'
import { formatCurrency } from '../../components/ui/ReportFilters'

const GSP_STORAGE_KEY = 'tms.eway.gspSettings'

const emptyForm = () => ({
  lrNumber: '',
  ewayBillNo: '',
  ewayBillDate: new Date().toISOString().slice(0, 10),
  validUpto: '',
  vehicleNo: '',
  fromPlace: '',
  toPlace: '',
  documentValue: '',
  status: 'Active',
  notes: '',
})

const STATUS_OPTIONS = ['(All)', 'Draft', 'Active', 'Expiring', 'Expired', 'Cancelled']

function statusVariant(status) {
  if (status === 'Active') return 'success'
  if (status === 'Expiring') return 'warning'
  if (status === 'Expired' || status === 'Cancelled') return 'danger'
  return 'default'
}

function TabBar({ tab, setTab, tabs }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={`px-3 py-2 text-sm font-medium transition ${
            tab === t.id
              ? 'border-b-2 border-primary text-primary'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function loadGspSettings() {
  try {
    return JSON.parse(localStorage.getItem(GSP_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function EwayBillPage() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'overview')
  const [items, setItems] = useState([])
  const [kpis, setKpis] = useState({})
  const [portal, setPortal] = useState({ configured: false })
  const [statusFilter, setStatusFilter] = useState('(All)')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [lrOptions, setLrOptions] = useState([])
  const [gsp, setGsp] = useState(() => ({
    gstin: '',
    username: '',
    apiKey: '',
    ...loadGspSettings(),
  }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ewayBillsApi.list({
        status: statusFilter !== '(All)' ? statusFilter : undefined,
        search: search || undefined,
      })
      setItems(res.items ?? [])
      setKpis(res.kpis ?? {})
      setPortal(res.portal ?? { configured: false })
    } catch (err) {
      toast({ title: 'E-Way load failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const lr = searchParams.get('lr')
    if (lr) {
      setForm((f) => ({ ...f, lrNumber: lr }))
      setTab('register')
    }
  }, [searchParams])

  useEffect(() => {
    lrApi.list({ page: 1, pageSize: 50 })
      .then((res) => {
        const rows = unwrapList(res)
        setLrOptions(rows.map((r) => ({
          value: r.lrNumber,
          label: `${r.lrNumber} · ${r.from || r.fromCity || ''} → ${r.to || r.toCity || ''}`,
          row: r,
        })))
      })
      .catch(() => {})
  }, [])

  const openRegister = (row = null) => {
    if (row) {
      setEditingId(row.id)
      setForm({
        lrNumber: row.lrNumber || '',
        ewayBillNo: row.ewayBillNo || '',
        ewayBillDate: row.ewayBillDate || new Date().toISOString().slice(0, 10),
        validUpto: row.validUpto || '',
        vehicleNo: row.vehicleNo || '',
        fromPlace: row.fromPlace || '',
        toPlace: row.toPlace || '',
        documentValue: row.documentValue ?? '',
        status: row.status === 'Expiring' || row.status === 'Expired' ? 'Active' : (row.status || 'Active'),
        notes: row.notes || '',
      })
    } else {
      setEditingId(null)
      setForm(emptyForm())
    }
    setTab('register')
  }

  const onLrPick = (lrNumber) => {
    const opt = lrOptions.find((o) => o.value === lrNumber)
    const row = opt?.row
    setForm((f) => ({
      ...f,
      lrNumber,
      vehicleNo: f.vehicleNo || row?.vehicle || row?.vehicleNumber || '',
      fromPlace: f.fromPlace || row?.from || row?.fromCity || '',
      toPlace: f.toPlace || row?.to || row?.toCity || '',
      documentValue: f.documentValue || row?.freight || '',
      ewayBillDate: f.ewayBillDate || row?.lrDate || f.ewayBillDate,
    }))
  }

  const save = async (ev) => {
    ev.preventDefault()
    if (!form.lrNumber.trim()) {
      toast({ title: 'Validation', message: 'Select an LR.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        lrNumber: form.lrNumber.trim(),
        ewayBillNo: form.ewayBillNo || undefined,
        ewayBillDate: form.ewayBillDate || undefined,
        validUpto: form.validUpto || undefined,
        vehicleNo: form.vehicleNo || undefined,
        fromPlace: form.fromPlace || undefined,
        toPlace: form.toPlace || undefined,
        documentValue: form.documentValue === '' ? undefined : Number(form.documentValue),
        status: form.status,
        notes: form.notes || undefined,
      }
      if (editingId) await ewayBillsApi.update(editingId, payload)
      else await ewayBillsApi.create(payload)
      toast({ title: 'Saved', message: 'E-Way bill registered.', type: 'success' })
      setEditingId(null)
      setForm(emptyForm())
      setTab('list')
      load()
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async (id) => {
    try {
      await ewayBillsApi.generate(id)
    } catch (err) {
      toast({
        title: 'Portal not configured',
        message: err.message || 'GST e-way generate is not available yet. Enter the bill number manually.',
        type: 'warning',
      })
    }
  }

  const handleCancelPortal = async (id) => {
    try {
      await ewayBillsApi.cancel(id)
    } catch (err) {
      toast({
        title: 'Portal not configured',
        message: err.message || 'Use Mark cancelled for manual cancel.',
        type: 'warning',
      })
    }
  }

  const markCancelled = async (id) => {
    try {
      await ewayBillsApi.markCancelled(id)
      toast({ title: 'Cancelled', type: 'success' })
      load()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    }
  }

  const saveGsp = (ev) => {
    ev.preventDefault()
    localStorage.setItem(GSP_STORAGE_KEY, JSON.stringify({
      gstin: gsp.gstin || '',
      username: gsp.username || '',
      apiKey: gsp.apiKey || '',
    }))
    toast({
      title: 'Settings saved locally',
      message: 'Portal API is not connected yet. Credentials are stored for future GSP integration.',
      type: 'info',
    })
  }

  const kpiCards = useMemo(() => [
    { label: 'Total', value: kpis.total ?? 0, tone: 'blue' },
    { label: 'Active', value: kpis.active ?? 0, tone: 'green' },
    { label: 'Expiring (≤3d)', value: kpis.expiring ?? 0, tone: 'amber' },
    { label: 'Expired', value: kpis.expired ?? 0, tone: 'red' },
    { label: 'Missing on LRs', value: kpis.missingLrs ?? 0, tone: 'slate' },
  ], [kpis])

  return (
    <ERPContentPage module="Operations" title="E-Way Bill">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Track e-way bills against LRs. Portal generate/cancel is stubbed until GSP is configured.
        </p>
        <Button type="button" onClick={() => openRegister()}>Register E-Way</Button>
      </div>

      <TabBar
        tab={tab}
        setTab={(id) => {
          setTab(id)
          const next = new URLSearchParams(searchParams)
          next.set('tab', id)
          setSearchParams(next, { replace: true })
        }}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'list', label: 'List' },
          { id: 'register', label: editingId ? 'Edit' : 'Register' },
          { id: 'settings', label: 'Settings' },
        ]}
      />

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {kpiCards.map((c) => (
              <Card key={c.label} className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{loading ? '—' : c.value}</p>
              </Card>
            ))}
          </div>
          <Card className="p-4">
            <p className="mb-1 font-medium">Portal status</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {portal.configured ? 'Connected' : (portal.message || 'GST e-way portal (NIC/GSP) is not configured.')}
            </p>
            <Button size="sm" variant="outline" className="mt-3" type="button" onClick={() => setTab('settings')}>
              Open Settings
            </Button>
          </Card>
          <Card className="overflow-x-auto p-0">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <p className="text-sm font-medium">Recent e-way bills</p>
              <button type="button" className="text-xs font-medium text-primary" onClick={() => setTab('list')}>View all</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2 text-left">LR</th>
                  <th className="px-4 py-2 text-left">E-Way No.</th>
                  <th className="px-4 py-2 text-left">Valid Upto</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map((r) => (
                  <tr key={r.id} className="border-t dark:border-slate-800">
                    <td className="px-4 py-2">
                      <Link className="text-primary hover:underline" to={lrDetailPath(r.lrNumber)}>{r.lrNumber}</Link>
                    </td>
                    <td className="px-4 py-2">{r.ewayBillNo || '—'}</td>
                    <td className="px-4 py-2">{r.validUpto || '—'}</td>
                    <td className="px-4 py-2"><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && items.length === 0 && <p className="p-4 text-sm text-slate-500">No e-way bills yet. Register one or save an LR with E-Way Bill No.</p>}
          </Card>
        </div>
      )}

      {tab === 'list' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Search LR / e-way / vehicle"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              className="max-w-[10rem]"
              options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={load}>Refresh</Button>
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-3 py-2 text-left">LR No.</th>
                  <th className="px-3 py-2 text-left">E-Way No.</th>
                  <th className="px-3 py-2 text-left">Valid Upto</th>
                  <th className="px-3 py-2 text-left">Vehicle</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t dark:border-slate-800">
                    <td className="px-3 py-2">
                      <Link className="font-medium text-primary hover:underline" to={lrDetailPath(r.lrNumber)}>{r.lrNumber}</Link>
                    </td>
                    <td className="px-3 py-2">{r.ewayBillNo || '—'}</td>
                    <td className="px-3 py-2">{r.validUpto || '—'}</td>
                    <td className="px-3 py-2">{r.vehicleNo || '—'}</td>
                    <td className="px-3 py-2"><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
                    <td className="px-3 py-2">{r.source}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" type="button" onClick={() => openRegister(r)}>Edit</Button>
                        <Button size="sm" variant="outline" type="button" onClick={() => handleGenerate(r.id)}>Generate</Button>
                        <Button size="sm" variant="outline" type="button" onClick={() => handleCancelPortal(r.id)}>Cancel API</Button>
                        {r.status !== 'Cancelled' && (
                          <Button size="sm" variant="outline" type="button" className="text-red-600" onClick={() => markCancelled(r.id)}>
                            Mark cancelled
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && items.length === 0 && <p className="p-4 text-sm text-slate-500">No matching e-way bills.</p>}
          </Card>
        </div>
      )}

      {tab === 'register' && (
        <Card className="mx-auto max-w-2xl p-5">
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Select
              label="LR No. *"
              className="sm:col-span-2"
              value={form.lrNumber}
              onChange={(e) => onLrPick(e.target.value)}
              options={[{ value: '', label: 'Select LR…' }, ...lrOptions.map((o) => ({ value: o.value, label: o.label }))]}
            />
            <Input label="E-Way Bill No." value={form.ewayBillNo} onChange={(e) => setForm({ ...form, ewayBillNo: e.target.value })} placeholder="Enter portal number" />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['Draft', 'Active', 'Cancelled'].map((s) => ({ value: s, label: s }))}
            />
            <Input label="E-Way Date" type="date" value={form.ewayBillDate} onChange={(e) => setForm({ ...form, ewayBillDate: e.target.value })} />
            <Input label="Valid Upto" type="date" value={form.validUpto} onChange={(e) => setForm({ ...form, validUpto: e.target.value })} />
            <Input label="Vehicle No." value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })} />
            <Input label="Document Value ₹" type="number" value={form.documentValue} onChange={(e) => setForm({ ...form, documentValue: e.target.value })} />
            <Input label="From" value={form.fromPlace} onChange={(e) => setForm({ ...form, fromPlace: e.target.value })} />
            <Input label="To" value={form.toPlace} onChange={(e) => setForm({ ...form, toPlace: e.target.value })} />
            <Input label="Notes" className="sm:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : (editingId ? 'Update' : 'Save')}</Button>
              <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm()); setTab('list') }}>Cancel</Button>
            </div>
            {form.documentValue !== '' && (
              <p className="sm:col-span-2 text-xs text-slate-500">Value preview: {formatCurrency(Number(form.documentValue) || 0)}</p>
            )}
          </form>
        </Card>
      )}

      {tab === 'settings' && (
        <Card className="mx-auto max-w-lg p-5">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            GSP / NIC credentials (stored in this browser only). Live Generate/Cancel stays disabled until server-side portal integration is enabled.
          </p>
          <form onSubmit={saveGsp} className="space-y-3">
            <Input label="GSTIN" value={gsp.gstin} onChange={(e) => setGsp({ ...gsp, gstin: e.target.value })} placeholder="15-digit GSTIN" />
            <Input label="Portal username" value={gsp.username} onChange={(e) => setGsp({ ...gsp, username: e.target.value })} />
            <Input label="API key / password" type="password" value={gsp.apiKey} onChange={(e) => setGsp({ ...gsp, apiKey: e.target.value })} autoComplete="off" />
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Portal status: {portal.configured ? 'Connected' : 'Not connected'}
            </div>
            <Button type="submit">Save settings</Button>
          </form>
        </Card>
      )}
    </ERPContentPage>
  )
}
