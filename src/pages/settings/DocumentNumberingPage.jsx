import { useEffect, useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import { documentNumberingApi, branchesApi, unwrapList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Save, Hash } from 'lucide-react'

const RESET_OPTIONS = [
  { value: 'FinancialYear', label: 'Financial Year (Apr–Mar)' },
  { value: 'Never', label: 'Never' },
]

export default function DocumentNumberingPage() {
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [fy, setFy] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [drafts, setDrafts] = useState({})

  const load = async (selectedBranch = branchId) => {
    const params = selectedBranch ? { branchId: selectedBranch } : {}
    const [res, branchRes] = await Promise.all([
      documentNumberingApi.list(params),
      branchesApi.list(true),
    ])
    const list = res?.items ?? []
    setItems(list)
    setFy(res?.activeFinancialYear || '')
    setBranches(unwrapList(branchRes))
    const next = {}
    for (const row of list) {
      next[row.id] = {
        prefix: row.prefix,
        runningNumberLength: row.runningNumberLength,
        resetRule: row.resetRule,
        currentNumber: row.currentNumber,
        formatPattern: row.formatPattern,
      }
    }
    setDrafts(next)
  }

  useEffect(() => {
    load()
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [toast])

  const onBranchChange = async (id) => {
    setBranchId(id)
    setLoading(true)
    try {
      await load(id)
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const setDraft = (id, key, value) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: value } }))
  }

  const saveRow = async (row) => {
    const draft = drafts[row.id]
    if (!draft) return
    if (!draft.prefix?.trim()) {
      toast({ title: 'Validation', message: 'Prefix is required', type: 'error' })
      return
    }
    const pad = Number(draft.runningNumberLength)
    if (!Number.isFinite(pad) || pad < 1 || pad > 12) {
      toast({ title: 'Validation', message: 'Running number length must be 1–12', type: 'error' })
      return
    }
    setSavingId(row.id)
    try {
      const updated = await documentNumberingApi.update(row.id, {
        prefix: draft.prefix.trim(),
        runningNumberLength: pad,
        resetRule: draft.resetRule,
        currentNumber: Number(draft.currentNumber) || 0,
        formatPattern: draft.formatPattern,
      })
      setItems((rows) => rows.map((r) => (r.id === row.id ? { ...r, ...updated } : r)))
      setDrafts((d) => ({
        ...d,
        [row.id]: {
          prefix: updated.prefix,
          runningNumberLength: updated.runningNumberLength,
          resetRule: updated.resetRule,
          currentNumber: updated.currentNumber,
          formatPattern: updated.formatPattern,
        },
      }))
      toast({ title: 'Saved', message: `${row.documentType} numbering updated.`, type: 'success' })
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <ERPContentPage module="Settings" title="Document numbering">
      <Card className="mb-4 space-y-3 p-4">
        <p className="text-sm text-slate-600">
          Format: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">01/PN/2026-27/BKG/00001</code>
          {fy ? <> · Active FY <strong>{fy}</strong></> : null}
        </p>
        <p className="text-xs text-slate-500">Company and branch codes must be exactly 2 characters (Settings → Branch locations).</p>
        <div className="max-w-xs">
          <Select
            label="Branch"
            value={branchId}
            onChange={(e) => onBranchChange(e.target.value)}
            options={[
              { value: '', label: 'Current / all scoped branches' },
              ...branches.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` })),
            ]}
          />
        </div>
      </Card>

      {loading ? (
        <Card className="p-4 text-sm text-slate-500">Loading…</Card>
      ) : items.length === 0 ? (
        <Card className="p-4 text-sm text-slate-500">
          No numbering configs yet. Create a document (or ensure a branch is selected) to seed defaults.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((row) => {
            const draft = drafts[row.id] || {}
            return (
              <Card key={row.id} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{row.documentType}</h3>
                    <p className="text-xs text-slate-500">{row.branchCode} · {row.branchName}</p>
                  </div>
                  <p className="rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700">
                    Next: {row.previewNext}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="Prefix"
                    value={draft.prefix ?? ''}
                    onChange={(e) => setDraft(row.id, 'prefix', e.target.value.toUpperCase())}
                  />
                  <Input
                    label="Pad length"
                    type="number"
                    min={1}
                    max={12}
                    value={draft.runningNumberLength ?? 5}
                    onChange={(e) => setDraft(row.id, 'runningNumberLength', e.target.value)}
                  />
                  <Select
                    label="Reset rule"
                    value={draft.resetRule ?? 'FinancialYear'}
                    onChange={(e) => setDraft(row.id, 'resetRule', e.target.value)}
                    options={RESET_OPTIONS}
                  />
                  <Input
                    label="Current sequence"
                    type="number"
                    min={0}
                    value={draft.currentNumber ?? 0}
                    onChange={(e) => setDraft(row.id, 'currentNumber', e.target.value)}
                  />
                </div>
                <div className="mt-3 max-w-xl">
                  <Input
                    label="Format pattern"
                    value={draft.formatPattern ?? ''}
                    onChange={(e) => setDraft(row.id, 'formatPattern', e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Tokens: {'{company}'} {'{branch}'} {'{fy}'} {'{prefix}'} {'{seq}'}
                  </p>
                </div>
                <div className="mt-3">
                  <Button
                    icon={savingId === row.id ? Hash : Save}
                    disabled={savingId === row.id}
                    onClick={() => saveRow(row)}
                  >
                    {savingId === row.id ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </ERPContentPage>
  )
}
