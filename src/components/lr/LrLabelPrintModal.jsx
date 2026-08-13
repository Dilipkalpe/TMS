import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'
import { LabelPrintDocument, LabelPreviewSheet } from '../labels/LabelTemplateRenderer'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { labelTemplatesApi, lrApi } from '../../services/api'

/**
 * Preview / print package labels.
 * - Template = label design (layout), e.g. Express Shipping Label
 * - No. of packages = how many package stickers (PKG-01 … PKG-N)
 * - Copies = reprint each package sticker N times
 */
export default function LrLabelPrintModal({ open, onClose, lrNumber }) {
  const { print } = usePrint()
  const { toast } = useToast()
  const [copies, setCopies] = useState(1)
  const [packageCount, setPackageCount] = useState(1)
  const [suggestedCount, setSuggestedCount] = useState(null)
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [template, setTemplate] = useState(null)
  const [baseLabels, setBaseLabels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTemplates = useCallback(async () => {
    const res = await labelTemplatesApi.list({ type: 'LR_PACKAGE' })
    const active = (res.items || []).filter((t) => t.isActive !== false)
    setTemplates(active)
    return active
  }, [])

  const generate = useCallback(async (lr, tplId, pkgCount) => {
    if (!lr) return
    const count = Math.min(Math.max(Number(pkgCount) || 0, 0), 500)
    if (count < 1) {
      setError('Enter number of packages (at least 1).')
      setBaseLabels([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await lrApi.generateLabel(lr, {
        copies: 1,
        templateId: tplId || undefined,
        packageCount: count,
      })
      setTemplate(data.template || null)
      setBaseLabels(data.labels || [])
      if (data.template?.id) setTemplateId(String(data.template.id))
      if (data.suggestedPackageCount != null) setSuggestedCount(Number(data.suggestedPackageCount) || 0)
      if (data.packageCount != null) setPackageCount(Number(data.packageCount) || count)
    } catch (err) {
      setTemplate(null)
      setBaseLabels([])
      setError(err.message || 'Unable to generate labels.')
      toast({ title: 'LBL Print failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!open || !lrNumber) return
    let cancelled = false
    setCopies(1)
    setError('')
    ;(async () => {
      try {
        const list = await loadTemplates()
        if (cancelled) return
        const def = list.find((t) => t.isDefault) || list[0]
        const id = def?.id ? String(def.id) : ''
        setTemplateId(id)
        // First call without override to learn LR suggested count, then generate
        const probe = await lrApi.generateLabel(lrNumber, { copies: 1, templateId: id || undefined })
        if (cancelled) return
        const suggested = Number(probe.suggestedPackageCount ?? probe.packageCount ?? 1) || 1
        setSuggestedCount(suggested)
        setPackageCount(suggested)
        setTemplate(probe.template || null)
        setBaseLabels(probe.labels || [])
        if (probe.template?.id) setTemplateId(String(probe.template.id))
      } catch (err) {
        if (cancelled) return
        // LR may have no qty — still open with 1 package for user to edit
        setSuggestedCount(0)
        setPackageCount(1)
        try {
          const list = await loadTemplates()
          const def = list.find((t) => t.isDefault) || list[0]
          const id = def?.id ? String(def.id) : ''
          setTemplateId(id)
          await generate(lrNumber, id, 1)
        } catch (err2) {
          setError(err2.message || err.message || 'Failed to load labels.')
          toast({
            title: 'LBL Print',
            message: err2.message || err.message,
            type: 'error',
          })
        }
      }
    })()
    return () => { cancelled = true }
  }, [open, lrNumber, loadTemplates, generate, toast])

  const onTemplateChange = async (e) => {
    const id = e.target.value
    setTemplateId(id)
    await generate(lrNumber, id, packageCount)
  }

  const applyPackageCount = async () => {
    await generate(lrNumber, templateId, packageCount)
  }

  const previewLabels = useMemo(() => {
    const n = Math.min(Math.max(Number(copies) || 1, 1), 20)
    if (n <= 1) return baseLabels
    const byPkg = []
    const seen = new Set()
    for (const row of baseLabels) {
      const key = row.packageId || row.packageNo
      if (seen.has(key)) continue
      seen.add(key)
      byPkg.push(row)
    }
    const out = []
    for (const row of byPkg) {
      for (let c = 1; c <= n; c++) out.push({ ...row, copy: c })
    }
    return out
  }, [baseLabels, copies])

  const templateOptions = useMemo(
    () => templates.map((t) => ({
      value: String(t.id),
      label: `${t.templateName}${t.isDefault ? ' (Default)' : ''} — ${t.paperWidth}×${t.paperHeight} mm`,
    })),
    [templates],
  )

  const handlePrint = () => {
    if (!template || !previewLabels.length) return
    print(<LabelPrintDocument template={template} labels={previewLabels} />)
  }

  if (!open) return null

  const pkgN = Math.min(Math.max(Number(packageCount) || 0, 0), 500)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`LBL Print — ${lrNumber || ''}`}
      size="xl"
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <label className="flex items-center gap-2">
              <span>No. of packages</span>
              <Input
                type="number"
                min={1}
                max={500}
                value={packageCount}
                onChange={(e) => setPackageCount(e.target.value)}
                className="w-20"
              />
            </label>
            <Button variant="outline" size="sm" disabled={loading || pkgN < 1} onClick={applyPackageCount}>
              Apply
            </Button>
            <label className="flex items-center gap-2">
              <span>Copies each</span>
              <Input
                type="number"
                min={1}
                max={20}
                value={copies}
                onChange={(e) => setCopies(e.target.value)}
                className="w-16"
              />
            </label>
            <span className="text-slate-500">
              = {previewLabels.length} label(s)
              {suggestedCount != null && suggestedCount > 0 && (
                <> · LR suggests {suggestedCount}</>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handlePrint} disabled={loading || !previewLabels.length || !template}>
              Print
            </Button>
          </div>
        </div>
      )}
    >
      <p className="mb-3 text-xs text-slate-500">
        <strong>Label template</strong> is only the print design (layout). It is not a courier product.
        Use <strong>No. of packages</strong> to set how many stickers to print (PKG-01 … PKG-N).
      </p>

      <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Select
          label="Label template (design)"
          value={templateId}
          onChange={onTemplateChange}
          options={templateOptions}
          placeholder={templates.length ? 'Select template' : 'No templates'}
          disabled={loading || !templates.length}
        />
        <Button
          variant="outline"
          disabled={loading || !templateId || pkgN < 1}
          onClick={() => generate(lrNumber, templateId, packageCount)}
        >
          {loading ? 'Loading…' : 'Refresh preview'}
        </Button>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {loading && !template ? (
        <p className="text-sm text-slate-500">Generating labels…</p>
      ) : !template ? (
        <p className="text-sm text-slate-500">
          No template selected. Add or activate a template under Settings → Package label templates.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">
            Design: <strong>{template.templateName}</strong>
            {' · '}
            {template.paperWidth}×{template.paperHeight} mm
            {' · '}
            {pkgN} package label(s)
          </p>
          <div className="label-preview-stack">
            {previewLabels.slice(0, 12).map((row, i) => (
              <LabelPreviewSheet
                key={`${template.id}-${row.packageId}-${row.copy || 1}-${i}`}
                template={template}
                fields={row.fields || {}}
                maxWidthPx={340}
              />
            ))}
            {previewLabels.length > 12 && (
              <p className="text-xs text-slate-500">Showing first 12 of {previewLabels.length}. All will print.</p>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
