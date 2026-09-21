import { useCallback, useEffect, useMemo, useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { fieldConfigurationsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { RotateCcw, Save } from 'lucide-react'
import { effectiveDisplayName } from '../../utils/fieldConfig'

const MODULES = [
  { value: 'Booking', label: 'Booking' },
  { value: 'LR', label: 'LR' },
]

const MAX_LABEL = 120

export default function FieldConfigurationPage() {
  const { toast } = useToast()
  const [module, setModule] = useState('Booking')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (mod = module) => {
    setLoading(true)
    try {
      const res = await fieldConfigurationsApi.list(mod)
      const items = (res?.items ?? []).map((r) => ({
        ...r,
        customDisplayName: r.customDisplayName ?? '',
      }))
      items.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
        || String(a.technicalFieldName).localeCompare(String(b.technicalFieldName)))
      setRows(items)
      if (!items.length) {
        toast({
          title: 'No fields loaded',
          message: 'Field configuration returned 0 rows. Try Save after API restart, or check company selection.',
          type: 'warning',
        })
      }
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [module, toast])

  useEffect(() => {
    load(module)
  }, [module]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (technicalFieldName, patch) => {
    setRows((list) => list.map((r) => (
      r.technicalFieldName === technicalFieldName ? { ...r, ...patch } : r
    )))
  }

  const resetLabel = (technicalFieldName) => {
    updateRow(technicalFieldName, { customDisplayName: '', _resetCustom: true })
  }

  const dirtyCount = useMemo(() => rows.length, [rows])

  const save = async () => {
    for (const row of rows) {
      const custom = (row.customDisplayName ?? '').trim()
      if (custom.length > MAX_LABEL) {
        toast({
          title: 'Validation',
          message: `Custom label for ${row.technicalFieldName} exceeds ${MAX_LABEL} characters.`,
          type: 'error',
        })
        return
      }
    }

    setSaving(true)
    try {
      const payload = rows.map((r) => ({
        technicalFieldName: r.technicalFieldName,
        customDisplayName: (r.customDisplayName ?? '').trim() || null,
        isVisible: !!r.isVisible,
        isRequired: !!r.isRequired,
        displayOrder: Number(r.displayOrder) || 0,
        isActive: r.isActive !== false,
        resetCustomDisplayName: !!r._resetCustom && !(r.customDisplayName ?? '').trim(),
      }))
      const res = await fieldConfigurationsApi.save(module, payload)
      const items = (res?.items ?? []).map((r) => ({
        ...r,
        customDisplayName: r.customDisplayName ?? '',
      }))
      items.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      setRows(items)
      toast({ title: 'Saved', message: `${module} field configuration updated.`, type: 'success' })
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const saveButton = (
    <Button icon={saving ? undefined : Save} onClick={save} disabled={saving || loading}>
      {saving ? 'Saving…' : 'Save configuration'}
    </Button>
  )

  return (
    <ERPContentPage
      module="Settings"
      title="Field configuration"
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Settings', path: '/settings' },
        { label: 'Field configuration' },
      ]}
      toolbar={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500">
            Control Booking and LR field visibility, required status, display labels, and order.
          </p>
          {saveButton}
        </div>
      )}
    >
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Module</label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={module}
              onChange={(e) => setModule(e.target.value)}
            >
              {MODULES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-slate-500">
            Technical field names never change. Only the user-facing label is configurable.
            Hidden fields skip validation even if marked required. {dirtyCount} fields.
          </p>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading configuration…</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
              <tr>
                <th className="px-3 py-3">Technical field</th>
                <th className="px-3 py-3">Default label</th>
                <th className="px-3 py-3">Custom label</th>
                <th className="px-3 py-3 text-center">Visible</th>
                <th className="px-3 py-3 text-center">Required</th>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3 text-center">Active</th>
                <th className="px-3 py-3">Preview</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.technicalFieldName} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {row.technicalFieldName}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {row.defaultDisplayName}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Input
                        value={row.customDisplayName ?? ''}
                        onChange={(e) => updateRow(row.technicalFieldName, {
                          customDisplayName: e.target.value,
                          _resetCustom: false,
                        })}
                        placeholder={row.defaultDisplayName}
                        maxLength={MAX_LABEL}
                        className="min-w-[10rem]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        title="Reset to default"
                        onClick={() => resetLabel(row.technicalFieldName)}
                        icon={RotateCcw}
                        className="shrink-0"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!row.isVisible}
                      onChange={(e) => updateRow(row.technicalFieldName, { isVisible: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!row.isRequired}
                      disabled={!row.isVisible}
                      title={!row.isVisible ? 'Hidden fields are not validated' : undefined}
                      onChange={(e) => updateRow(row.technicalFieldName, { isRequired: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      value={row.displayOrder ?? 0}
                      onChange={(e) => updateRow(row.technicalFieldName, {
                        displayOrder: Number(e.target.value) || 0,
                      })}
                      className="w-20"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.isActive !== false}
                      onChange={(e) => updateRow(row.technicalFieldName, { isActive: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                    {effectiveDisplayName(row, row.defaultDisplayName)}
                    {row.isVisible && row.isRequired ? (
                      <span className="ml-1 text-red-500">*</span>
                    ) : null}
                    {!row.isVisible ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">hidden</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {!loading && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          {saveButton}
        </div>
      )}
    </ERPContentPage>
  )
}
