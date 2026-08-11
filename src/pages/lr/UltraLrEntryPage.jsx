import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import BulkLrToolbar from '../../components/lr/bulk/BulkLrToolbar'
import BulkLrCommonHeader from '../../components/lr/bulk/BulkLrCommonHeader'
import BulkLrRowsGrid from '../../components/lr/bulk/BulkLrRowsGrid'
import BulkLrBottomPanels from '../../components/lr/bulk/BulkLrBottomPanels'
import BulkLrTemplatesModal from '../../components/lr/bulk/BulkLrTemplatesModal'
import {
  buildBulkLrPayload,
  createEmptyBulkRows,
  deleteBulkTemplate,
  emptyBulkCommon,
  emptyBulkRow,
  isBulkRowFilled,
  loadBulkTemplates,
  loadRememberedCommon,
  parseBulkLrCsv,
  patchBulkRow,
  persistRememberedCommon,
  saveBulkTemplate,
  summarizeBulkRows,
  validateBulkCommon,
  validateBulkRow,
  BULK_LR_FIELD_KEYS,
} from '../../components/lr/bulk/bulkLrModel'
import { lrApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { useKeyboardPageActions, useAutoFocus } from '../../hooks/useKeyboardPageActions'
import { useGridKeyboard } from '../../hooks/useGridKeyboard'

const BLANK_ROWS_AFTER_SAVE = 4

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UltraLrEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const fileInputRef = useRef(null)
  const formRef = useRef(null)

  const [common, setCommon] = useState(() => loadRememberedCommon() || emptyBulkCommon())
  const [rows, setRows] = useState(() => createEmptyBulkRows())
  const [remarks, setRemarks] = useState('')
  const [documents, setDocuments] = useState([])
  const [commonErrors, setCommonErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [printAfterSave, setPrintAfterSave] = useState(false)
  const [todayCount, setTodayCount] = useState(0)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templates, setTemplates] = useState(() => loadBulkTemplates())
  const [lastSaved, setLastSaved] = useState([])

  const summary = useMemo(
    () => summarizeBulkRows(rows, common.autoCalculate !== false),
    [rows, common.autoCalculate],
  )
  const pendingCount = summary.totalLrs

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    lrApi.list({ page: 1, pageSize: 1, dateFrom: today, dateTo: today })
      .then((res) => {
        const total = res?.total ?? res?.Total ?? 0
        setTodayCount(Number(total) || 0)
      })
      .catch(() => {})
  }, [lastSaved])

  const updateCommon = useCallback((field, value) => {
    setCommon((prev) => ({ ...prev, [field]: value }))
    setCommonErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const patchCommon = useCallback((patch) => {
    setCommon((prev) => ({ ...prev, ...patch }))
    setCommonErrors((prev) => {
      const next = { ...prev }
      Object.keys(patch).forEach((k) => { delete next[k] })
      return next
    })
  }, [])

  const updateCell = useCallback((idx, field, value) => {
    setRows((prev) => prev.map((row, i) => (
      i === idx ? patchBulkRow(row, field, value, common.autoCalculate !== false) : row
    )))
  }, [common.autoCalculate])

  const patchRow = useCallback((idx, patch) => {
    setRows((prev) => prev.map((row, i) => {
      if (i !== idx) return row
      const merged = { ...row, ...patch }
      if (common.autoCalculate !== false && (Number(merged.rate) > 0 && Number(merged.chargedWeight) > 0)) {
        return patchBulkRow(merged, 'rate', merged.rate, true)
      }
      return merged
    }))
  }, [common.autoCalculate])

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyBulkRow()])
  }, [])

  const copyRow = useCallback((idx) => {
    setRows((prev) => {
      const src = prev[idx]
      if (!src) return prev
      const clone = { ...src, id: emptyBulkRow().id }
      const next = [...prev]
      next.splice(idx + 1, 0, clone)
      return next
    })
  }, [])

  const removeRow = useCallback((idx) => {
    setRows((prev) => {
      if (prev.length <= 1) return [emptyBulkRow()]
      return prev.filter((_, i) => i !== idx)
    })
  }, [])

  const { containerRef: gridRef } = useGridKeyboard({
    rows,
    setRows,
    createEmptyRow: emptyBulkRow,
    fieldKeys: BULK_LR_FIELD_KEYS,
    enabled: true,
  })

  const handleClear = useCallback(() => {
    setRows(createEmptyBulkRows())
    setRemarks('')
    setDocuments([])
    setCommonErrors({})
    setLastSaved([])
    if (!common.rememberLast) setCommon(emptyBulkCommon())
    toast({ title: 'Cleared', message: 'Grid and remarks cleared.', type: 'info' })
  }, [common.rememberLast, toast])

  const handleImportFile = useCallback(async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      const imported = parseBulkLrCsv(text)
      if (!imported.length) {
        toast({ title: 'Import', message: 'No rows found in CSV.', type: 'warning' })
        return
      }
      setRows((prev) => {
        const kept = prev.filter(isBulkRowFilled)
        return [...kept, ...imported, emptyBulkRow(), emptyBulkRow()]
      })
      toast({ title: 'Imported', message: `${imported.length} row(s) loaded from CSV.`, type: 'success' })
    } catch (err) {
      toast({ title: 'Import failed', message: err.message, type: 'error' })
    }
  }, [toast])

  const handleSaveAll = useCallback(async (andPrint = false) => {
    const errors = validateBulkCommon(common)
    if (Object.keys(errors).length) {
      setCommonErrors(errors)
      toast({ title: 'Validation', message: Object.values(errors)[0], type: 'warning' })
      document.getElementById('bulk-lr-common')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    const filledIndexes = rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => isBulkRowFilled(row))

    if (!filledIndexes.length) {
      toast({ title: 'Validation', message: 'Add at least one filled LR row.', type: 'warning' })
      return
    }

    for (const { row, idx } of filledIndexes) {
      const msg = validateBulkRow(row, idx)
      if (msg) {
        toast({ title: 'Validation', message: msg, type: 'warning' })
        return
      }
    }

    setSaving(true)
    const successes = []
    const failures = []

    try {
      for (const { row, idx } of filledIndexes) {
        try {
          const payload = buildBulkLrPayload(common, row, remarks)
          const created = await lrApi.create(payload)
          successes.push({ sr: idx + 1, lrNumber: created.lrNumber, idx })

          if (andPrint || printAfterSave) {
            try {
              const lr = await lrApi.get(created.lrNumber)
              await printModuleDocument({
                moduleCode: PRINT_MODULE_CODES.LR_LIST,
                company,
                print,
                documentData: { lr },
              })
            } catch {
              /* print is best-effort */
            }
          }
        } catch (err) {
          failures.push({ sr: idx + 1, message: err.message || 'Save failed' })
        }
      }

      setLastSaved(successes.map((s) => s.lrNumber))
      if (successes.length) {
        persistRememberedCommon(common)
        setTodayCount((n) => n + successes.length)
        const successIdx = new Set(successes.map((s) => s.idx))
        setRows((prev) => {
          const failedOrBlank = prev.filter((row, i) => !successIdx.has(i))
          const stillFilled = failedOrBlank.filter(isBulkRowFilled)
          if (!stillFilled.length) return createEmptyBulkRows(BLANK_ROWS_AFTER_SAVE)
          return [...stillFilled, ...createEmptyBulkRows(2)]
        })
      }

      if (failures.length === 0) {
        toast({
          title: 'Saved',
          message: `${successes.length} LR(s) created: ${successes.map((s) => s.lrNumber).join(', ')}`,
          type: 'success',
        })
      } else if (successes.length) {
        toast({
          title: 'Partial save',
          message: `${successes.length} saved, ${failures.length} failed (row ${failures.map((f) => f.sr).join(', ')}).`,
          type: 'warning',
        })
      } else {
        toast({
          title: 'Save failed',
          message: failures[0]?.message || 'Could not create LRs.',
          type: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }, [common, rows, remarks, printAfterSave, company, print, toast])

  useAutoFocus(formRef)
  useKeyboardPageActions({
    onSave: () => handleSaveAll(false),
    onPrint: () => handleSaveAll(true),
    onCancel: () => navigate('/lr/list'),
    onNew: handleClear,
    onSearch: () => {
      document.getElementById('bulk-lr-common')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.querySelector('[data-bulk-party-search] input')?.focus()
    },
  }, [handleSaveAll, handleClear, navigate])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        fileInputRef.current?.click()
      }
      if (e.key === 'F5') {
        e.preventDefault()
        addRow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addRow])

  return (
    <div className="bulk-lr-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="LR"
        title="Ultra Fast LR Entry"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'LR', path: '/lr/list' },
          { label: 'Bulk LR Entry' },
        ]}
      />

      <div ref={formRef} data-kbd-form-root className="lr-entry-v2-page bulk-lr-shell flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="bulk-lr-sticky-chrome shrink-0 px-2 pt-2 sm:px-3 sm:pt-3">
          <BulkLrToolbar
            saving={saving}
            todayCount={todayCount}
            pendingCount={pendingCount}
            onSaveAll={() => handleSaveAll(false)}
            onClear={handleClear}
            onImportClick={() => fileInputRef.current?.click()}
            onTemplatesClick={() => setTemplatesOpen(true)}
          />
          {lastSaved.length > 0 && (
            <p className="bulk-lr-last-saved">
              Last saved: <strong>{lastSaved.join(', ')}</strong>
            </p>
          )}
        </div>

        <div className="lr-entry-v2-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2 sm:px-3 sm:pb-3">
          <BulkLrCommonHeader
            common={common}
            errors={commonErrors}
            onChange={updateCommon}
            onPatch={patchCommon}
          />

          <BulkLrRowsGrid
            rows={rows}
            gridRef={gridRef}
            autoCalculate={common.autoCalculate !== false}
            onAddRow={addRow}
            onImportClick={() => fileInputRef.current?.click()}
            onUpdateCell={updateCell}
            onPatchRow={patchRow}
            onCopyRow={copyRow}
            onRemoveRow={removeRow}
          />

          <BulkLrBottomPanels
            remarks={remarks}
            onRemarksChange={setRemarks}
            documents={documents}
            onAddDocuments={(files) => {
              setDocuments((prev) => [
                ...prev,
                ...files.map((f) => ({
                  id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
                  name: f.name,
                  sizeLabel: formatFileSize(f.size),
                })),
              ])
            }}
            onRemoveDocument={(id) => setDocuments((prev) => prev.filter((d) => d.id !== id))}
            common={common}
            rows={rows}
            summary={summary}
          />
        </div>

        <footer className="lr-entry-v2-footer bulk-lr-footer shrink-0 border-t border-slate-200 bg-white px-2 py-2 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="bulk-lr-footer-inner">
            <label className="bulk-lr-check">
              <input
                type="checkbox"
                checked={printAfterSave}
                onChange={(e) => setPrintAfterSave(e.target.checked)}
              />
              Print after save
            </label>
            <div className="bulk-lr-footer-actions">
              <button
                type="button"
                className="bulk-lr-btn"
                disabled={saving}
                onClick={() => navigate('/lr/list')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bulk-lr-btn bulk-lr-btn-primary"
                disabled={saving}
                onClick={() => handleSaveAll(false)}
              >
                {saving ? 'Saving…' : 'Save All LRs'}
                <span className="bulk-lr-kbd">F2</span>
              </button>
              <button
                type="button"
                className="bulk-lr-btn bulk-lr-btn-accent"
                disabled={saving}
                onClick={() => handleSaveAll(true)}
              >
                Save &amp; Print
              </button>
            </div>
          </div>
        </footer>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleImportFile(file)
          e.target.value = ''
        }}
      />

      <BulkLrTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        templates={templates}
        onSaveCurrent={(name) => {
          const next = saveBulkTemplate(name, common)
          setTemplates(next)
          toast({ title: 'Template saved', message: name, type: 'success' })
        }}
        onApply={(t) => {
          setCommon((prev) => ({
            ...prev,
            ...t.common,
            lrDate: prev.lrDate || new Date().toISOString().slice(0, 10),
            autoCalculate: t.common?.autoCalculate ?? prev.autoCalculate,
            rememberLast: t.common?.rememberLast ?? prev.rememberLast,
          }))
          setTemplatesOpen(false)
          toast({ title: 'Template applied', message: t.name, type: 'success' })
        }}
        onDelete={(name) => {
          setTemplates(deleteBulkTemplate(name))
        }}
      />
    </div>
  )
}
