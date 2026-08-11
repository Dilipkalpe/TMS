import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Loader2, Printer, Save } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import {
  PRINT_MODULES,
  PRINT_TEMPLATE_CODES,
  PRINT_TEMPLATE_LABELS,
} from '../../config/printModules'
import {
  invalidatePrintTemplateConfig,
  loadPrintTemplateConfig,
  printTemplateApi,
} from '../../services/printTemplateService'
import { renderPrintPreview } from '../../services/printTemplateRegistry'

export default function PrintTemplateSettingsPage() {
  const { company, print } = usePrint()
  const { toast } = useToast()
  const [modules, setModules] = useState([])
  const [draft, setDraft] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(null)

  const defaultModules = () =>
    PRINT_MODULES.map((m) => ({
      moduleCode: m.moduleCode,
      moduleName: m.label,
      templateCode: 'T1',
    }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await loadPrintTemplateConfig(true)
      const list = res.modules?.length ? res.modules : defaultModules()
      setModules(list)
      const map = {}
      list.forEach((m) => { map[m.moduleCode] = m.templateCode ?? 'T1' })
      setDraft(map)
    } catch (err) {
      const list = defaultModules()
      setModules(list)
      const map = {}
      list.forEach((m) => { map[m.moduleCode] = 'T1' })
      setDraft(map)
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const setTemplate = (moduleCode, templateCode) => {
    setDraft((d) => ({ ...d, [moduleCode]: templateCode }))
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const configs = Object.entries(draft).map(([moduleCode, templateCode]) => ({
        moduleCode,
        templateCode,
      }))
      await printTemplateApi.saveBulk(configs)
      invalidatePrintTemplateConfig()
      await loadPrintTemplateConfig(true)
      toast({ title: 'Saved', message: 'Document print templates updated.', type: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const saveOne = async (moduleCode) => {
    setSaving(true)
    try {
      await printTemplateApi.save(moduleCode, draft[moduleCode] ?? 'T1')
      invalidatePrintTemplateConfig()
      await loadPrintTemplateConfig(true)
      toast({ title: 'Saved', message: `${moduleCode} template updated.`, type: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const preview = async (moduleCode) => {
    setPreviewing(moduleCode)
    try {
      print(renderPrintPreview({ moduleCode, templateCode: draft[moduleCode] ?? 'T1', company }))
    } finally {
      setPreviewing(null)
    }
  }

  const templateOptions = PRINT_TEMPLATE_CODES.map((code) => ({
    value: code,
    label: PRINT_TEMPLATE_LABELS[code] ?? code,
  }))

  return (
    <ERPContentPage module="Settings" title="Document Print Templates">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Choose the standard transport layout used when you print an <strong>individual record</strong>
        {' '}(Lorry Receipt, Loading Slip, Transit Pass, POD, Freight Bill, etc.).
        Preview shows a sample document — not a list. Preferences are saved per user.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button icon={saving ? Loader2 : Save} disabled={saving || loading} onClick={saveAll}>
          Save all
        </Button>
        <Link to="/settings" className="text-sm text-primary hover:underline">← Back to Settings hub</Link>
      </div>

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading template configuration…</p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Document</th>
                {PRINT_TEMPLATE_CODES.map((t) => (
                  <th key={t} className="px-2 py-2 text-center text-xs font-semibold" title={PRINT_TEMPLATE_LABELS[t]}>
                    {t}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-semibold">Selected format</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => {
                const selected = draft[m.moduleCode] ?? m.templateCode ?? 'T1'
                return (
                  <tr key={m.moduleCode} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">{m.moduleName}</td>
                    {PRINT_TEMPLATE_CODES.map((t) => (
                      <td key={t} className="px-2 py-2.5 text-center">
                        <input
                          type="radio"
                          name={`tpl-${m.moduleCode}`}
                          checked={selected === t}
                          onChange={() => setTemplate(m.moduleCode, t)}
                          title={PRINT_TEMPLATE_LABELS[t]}
                          className="h-4 w-4 accent-primary"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      <Select
                        options={templateOptions}
                        value={selected}
                        onChange={(e) => setTemplate(m.moduleCode, e.target.value)}
                        className="min-w-[14rem]"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Preview sample document"
                          aria-label="Preview sample document"
                          disabled={previewing === m.moduleCode}
                          onClick={() => preview(m.moduleCode)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-primary hover:bg-primary/10 dark:border-slate-600"
                        >
                          {previewing === m.moduleCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          title="Save document template"
                          aria-label="Save document template"
                          disabled={saving}
                          onClick={() => saveOne(m.moduleCode)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="mt-4 p-4 text-sm text-slate-600 dark:text-slate-400">
        <p className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
          <Printer className="h-4 w-4 text-primary" />
          Standard transport formats
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li><strong>T1 Standard</strong> — classic A4 consignment / LR office copy.</li>
          <li><strong>T2 Compact</strong> — denser layout for half-page or multi-copy printers.</li>
          <li><strong>T3 Full Border</strong> — heavy borders for stamped / filed office copies.</li>
          <li><strong>T4 Branded Modern</strong> — coloured title bar for company branding.</li>
          <li><strong>T5 Minimal</strong> — light rules, suitable for thermal / plain stock.</li>
          <li>Preview and Print on a record both use your selected format for that document type.</li>
        </ul>
      </Card>
    </ERPContentPage>
  )
}
