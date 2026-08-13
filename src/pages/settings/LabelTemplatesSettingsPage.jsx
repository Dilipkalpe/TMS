import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Save, Star } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { labelTemplatesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { LabelPreviewSheet } from '../../components/labels/LabelTemplateRenderer'

const SAMPLE_FIELDS = {
  CompanyName: 'Demo Transport',
  CompanyAddress: '12 Industrial Estate\nPune, MH 411001\nPhone: 020-1234567',
  CompanyLogo: '',
  CompanyPhone: '020-1234567',
  LRNo: '68/DE/2026-27/LR/00001',
  BookingNo: 'BK-001',
  PackageDisplay: '01 / 03',
  PackageId: '68/DE/2026-27/LR/00001-PKG-01',
  PackageNo: '1',
  TotalPackages: '3',
  Consignor: 'ABC Industries',
  Consignee: 'XYZ Traders',
  FromBlock: 'ABC Industries\n3055 Barons Cove\nPune, MH 411001',
  ToBlock: 'XYZ Traders\n1717 County Road\nJalgaon, MH 425001',
  From: 'Pune',
  To: 'Jalgaon',
  Weight: '25.5 KG',
  VehicleNo: 'MH12AB1234',
  PackageType: 'Carton',
  Contents: 'General Cargo',
  Branch: 'DE',
  DateTime: '13-Aug-2026',
  SpecialInstructions: 'Handle with care',
}

export default function LabelTemplatesSettingsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [name, setName] = useState('')
  const [width, setWidth] = useState(100)
  const [height, setHeight] = useState(150)
  const [jsonText, setJsonText] = useState('')
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selected = items.find((t) => t.id === selectedId) || null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await labelTemplatesApi.list({ type: 'LR_PACKAGE' })
      const list = res.items || []
      setItems(list)
      const pick = list.find((t) => t.isDefault) || list[0]
      if (pick) selectTemplate(pick)
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  function selectTemplate(t) {
    setSelectedId(t.id)
    setName(t.templateName || '')
    setWidth(t.paperWidth || 100)
    setHeight(t.paperHeight || 150)
    setActive(t.isActive !== false)
    setJsonText(JSON.stringify(t.templateJson || {}, null, 2))
  }

  const save = async () => {
    if (!selectedId) return
    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      toast({ title: 'Invalid JSON', message: 'Fix template JSON before saving.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const updated = await labelTemplatesApi.update(selectedId, {
        templateName: name,
        paperWidth: Number(width) || 100,
        paperHeight: Number(height) || 150,
        templateJson: parsed,
        isActive: active,
      })
      toast({ title: 'Saved', message: 'Label template updated.', type: 'success' })
      await load()
      if (updated?.id) selectTemplate(updated)
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const setDefault = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      await labelTemplatesApi.setDefault(selectedId)
      toast({ title: 'Default set', message: 'This template is now the default for LBL Print.', type: 'success' })
      await load()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const previewTemplate = selected
    ? {
        ...selected,
        templateName: name,
        paperWidth: Number(width) || 100,
        paperHeight: Number(height) || 150,
        templateJson: (() => { try { return JSON.parse(jsonText) } catch { return selected.templateJson } })(),
      }
    : null

  return (
    <ERPContentPage
      module="Settings"
      title="Package label templates"
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Settings', path: '/settings' },
        { label: 'Label templates' },
      ]}
      toolbar={(
        <div className="flex flex-wrap gap-2">
          <Link to="/settings"><Button variant="outline">Back</Button></Link>
          <Button icon={Star} variant="outline" onClick={setDefault} disabled={!selectedId || saving}>Set default</Button>
          <Button icon={Save} onClick={save} disabled={!selectedId || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    >
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        Label layouts for LR List <strong>LBL Print</strong> are stored in the database as JSON.
        Do not hard-code layouts in the app — edit the active/default template here.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Templates</p>
            <ul className="space-y-1">
              {items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => selectTemplate(t)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm ${
                      t.id === selectedId
                        ? 'bg-violet-600 text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{t.templateName}</span>
                    {t.isDefault && (
                      <Badge variant={t.id === selectedId ? 'default' : 'success'}>Default</Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-4">
            <Card className="space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Template name</span>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="flex items-end gap-2 text-sm pb-2">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                  Active
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Width (mm)</span>
                  <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Height (mm)</span>
                  <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-500">template_json</span>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={16}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
                  spellCheck={false}
                />
              </label>
            </Card>

            <Card className="p-4">
              <p className="mb-2 text-sm font-medium">Preview (sample data)</p>
              <div className="label-preview-stack">
                {previewTemplate && (
                  <LabelPreviewSheet template={previewTemplate} fields={SAMPLE_FIELDS} maxWidthPx={360} />
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </ERPContentPage>
  )
}
