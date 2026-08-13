import { useEffect, useMemo, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { APP_BASE_PATH } from '../../config/api'
import './labelPrint.css'

const MM_TO_PX = 3.7795275591 // 96dpi

function resolveLogoUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  if (path.startsWith('/uploads') || path.startsWith('/api')) return path
  return `${APP_BASE_PATH || ''}${path}`
}

function unescapeTemplateText(s) {
  return String(s).replace(/\\n/g, '\n').replace(/\\t/g, '\t')
}

function fieldValue(fields, field, label, content) {
  if (content != null && content !== '') return unescapeTemplateText(content)
  if (!field) return label ? unescapeTemplateText(label) : ''
  const v = fields?.[field] ?? fields?.[field.toLowerCase()] ?? ''
  if (label) return `${unescapeTemplateText(label)}${v === '' || v == null ? '' : `: ${v}`}`
  return v == null || v === '' ? '' : String(v)
}

function BarcodeEl({ value, widthMm, heightMm }) {
  const svgRef = useRef(null)
  useEffect(() => {
    if (!svgRef.current || !value) return
    try {
      JsBarcode(svgRef.current, String(value), {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        width: 1.5,
        height: Math.max(20, heightMm * MM_TO_PX * 0.9),
      })
    } catch {
      /* invalid barcode value */
    }
  }, [value, heightMm])
  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
}

function QrEl({ value, sizeMm }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (!canvasRef.current || !value) return
    const px = Math.max(40, Math.round(sizeMm * MM_TO_PX))
    QRCode.toCanvas(canvasRef.current, String(value), {
      width: px,
      margin: 0,
      errorCorrectionLevel: 'M',
    }).catch(() => {})
  }, [value, sizeMm])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

function useTemplateConfig(template) {
  return useMemo(() => {
    const raw = template?.templateJson || template?.template_json || {}
    const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return {} } })() : raw
    const width = Number(template?.paperWidth || parsed.width || 100)
    const height = Number(template?.paperHeight || parsed.height || 150)
    const elements = Array.isArray(parsed.elements) ? parsed.elements : []
    return {
      width,
      height,
      elements,
      border: parsed.border !== false,
      padding: Number(parsed.padding || 0),
    }
  }, [template])
}

/**
 * Renders one label from DB template_json + merge fields (no hard-coded business layout).
 * Supported element types: text, static, image, barcode, qr, rect, line, circle
 */
export function LabelSheet({ template, fields, className = '' }) {
  const cfg = useTemplateConfig(template)

  const style = {
    width: `${cfg.width}mm`,
    height: `${cfg.height}mm`,
    border: cfg.border ? '1.2px solid #111' : '1px solid #cbd5e1',
    boxSizing: 'border-box',
  }

  return (
    <div className={`label-sheet ${className}`} style={style} data-label-w={cfg.width} data-label-h={cfg.height}>
      {cfg.elements.map((el, idx) => {
        const x = Number(el.x || 0)
        const y = Number(el.y || 0)
        const w = el.width != null ? Number(el.width) : undefined
        const h = el.height != null ? Number(el.height) : undefined
        const fontSize = Number(el.fontSize || 10)
        const type = String(el.type || 'text').toLowerCase()
        const value = fieldValue(fields, el.field, el.label, el.content ?? el.text)
        const box = {
          left: `${x}mm`,
          top: `${y}mm`,
          width: w != null ? `${w}mm` : undefined,
          height: h != null ? `${h}mm` : undefined,
          fontSize: `${fontSize}pt`,
          fontWeight: el.bold ? 700 : 400,
          textAlign: el.align || 'left',
          textTransform: el.uppercase ? 'uppercase' : undefined,
          letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
          lineHeight: el.lineHeight || 1.2,
          whiteSpace: el.multiline || type === 'block' ? 'pre-wrap' : 'pre-wrap',
          overflow: 'hidden',
          color: el.color || '#111',
          background: el.fill || undefined,
          border: el.stroke ? `${el.strokeWidth || 1}px solid ${el.stroke}` : undefined,
          borderRadius: el.radius != null ? `${el.radius}mm` : undefined,
          display: 'flex',
          alignItems: el.vAlign === 'middle' ? 'center' : el.vAlign === 'bottom' ? 'flex-end' : 'flex-start',
          justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
          padding: el.pad != null ? `${el.pad}mm` : undefined,
        }

        if (type === 'rect' || type === 'box') {
          return (
            <div
              key={idx}
              className="label-sheet__el"
              style={{
                ...box,
                background: el.fill || 'transparent',
                border: `${el.strokeWidth || 1}px solid ${el.stroke || '#111'}`,
                borderRadius: el.radius != null ? `${el.radius}mm` : undefined,
              }}
            />
          )
        }

        if (type === 'line') {
          const thick = Number(el.strokeWidth || el.height || 0.4)
          return (
            <div
              key={idx}
              className="label-sheet__el"
              style={{
                left: `${x}mm`,
                top: `${y}mm`,
                width: `${w || cfg.width}mm`,
                height: `${thick}mm`,
                background: el.stroke || '#111',
              }}
            />
          )
        }

        if (type === 'circle') {
          const size = Number(w || h || 18)
          return (
            <div
              key={idx}
              className="label-sheet__el"
              style={{
                left: `${x}mm`,
                top: `${y}mm`,
                width: `${size}mm`,
                height: `${size}mm`,
                borderRadius: '50%',
                border: `${el.strokeWidth || 1.5}px solid ${el.stroke || '#111'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${fontSize}pt`,
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: 1.05,
                padding: '1mm',
                textTransform: 'uppercase',
              }}
            >
              {value || el.content || 'FRAGILE'}
            </div>
          )
        }

        if (type === 'image') {
          const src = resolveLogoUrl(fields?.[el.field] || fields?.CompanyLogo)
          if (!src) return null
          return (
            <div key={idx} className="label-sheet__el" style={box}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )
        }

        if (type === 'barcode') {
          const code = fields?.[el.field] || fields?.PackageId || ''
          return (
            <div key={idx} className="label-sheet__el" style={box}>
              <BarcodeEl value={code} widthMm={w || 80} heightMm={h || 24} />
            </div>
          )
        }

        if (type === 'qr' || type === 'qrcode') {
          const code = fields?.[el.field] || fields?.PackageId || ''
          const size = Math.min(w || 30, h || 30)
          return (
            <div key={idx} className="label-sheet__el" style={{ ...box, width: `${size}mm`, height: `${size}mm` }}>
              <QrEl value={code} sizeMm={size} />
            </div>
          )
        }

        // text | static | block
        return (
          <div key={idx} className="label-sheet__el" style={box}>
            {value}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Screen preview: scale full-size label down so the whole sticker is visible in the modal.
 * Print path still uses unscaled LabelSheet / LabelPrintDocument.
 */
export function LabelPreviewSheet({ template, fields, maxWidthPx = 320 }) {
  const cfg = useTemplateConfig(template)
  const naturalW = cfg.width * MM_TO_PX
  const naturalH = cfg.height * MM_TO_PX
  const scale = Math.min(1, maxWidthPx / Math.max(naturalW, 1))
  const frameW = naturalW * scale
  const frameH = naturalH * scale

  return (
    <div
      className="label-preview-frame"
      style={{ width: `${frameW}px`, height: `${frameH}px` }}
      title={`${cfg.width}×${cfg.height} mm (preview ${Math.round(scale * 100)}%)`}
    >
      <div
        className="label-preview-scale"
        style={{
          width: `${cfg.width}mm`,
          height: `${cfg.height}mm`,
          transform: `scale(${scale})`,
        }}
      >
        <LabelSheet template={template} fields={fields} />
      </div>
    </div>
  )
}

export function LabelPrintDocument({ template, labels }) {
  const w = Number(template?.paperWidth || template?.templateJson?.width || 100)
  const h = Number(template?.paperHeight || template?.templateJson?.height || 150)
  return (
    <div className="label-print-sheet">
      <style>{`@page { size: ${w}mm ${h}mm; margin: 0; }`}</style>
      {(labels || []).map((row, i) => (
        <LabelSheet key={`${row.packageId || i}-${row.copy || 1}`} template={template} fields={row.fields || {}} />
      ))}
    </div>
  )
}

export default LabelSheet
