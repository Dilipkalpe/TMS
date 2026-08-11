import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { Trash2, Upload } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export function OpsChecklist({ items = [], values = {}, onChange }) {
  return (
    <div className="space-y-1">
      {items.map((label) => (
        <label key={label} className="flex items-center gap-2 text-[10px]">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={!!values[label]}
            onChange={(e) => onChange?.({ ...values, [label]: e.target.checked })}
          />
          {label}
        </label>
      ))}
    </div>
  )
}

export function OpsSignaturePad({ label, value, onChange, height = 80 }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0)
    img.src = value
  }, [value])

  const pos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const start = (e) => { drawing.current = true; const p = pos(e); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault() }
  const move = (e) => {
    if (!drawing.current) return
    const p = pos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1e3a8a'
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    e.preventDefault()
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange?.(canvasRef.current.toDataURL('image/png'))
  }

  return (
    <div>
      <p className="mb-1 text-[10px] font-medium text-slate-600">{label}</p>
      <div className="relative rounded border border-slate-200 bg-white dark:border-slate-700">
        <canvas
          ref={canvasRef}
          width={280}
          height={height}
          className="w-full touch-none"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        <button type="button" className="absolute bottom-1 right-1 text-[10px] text-primary hover:underline" onClick={() => { const c = canvasRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); onChange?.('') }}>Clear</button>
      </div>
    </div>
  )
}

export function OpsAttachments({ lrNumber, documents = [], docType = 'Supporting Document', onUploaded, uploadFn }) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadFn) return
    setUploading(true)
    try {
      await uploadFn(lrNumber, file, docType, file.name)
      toast({ title: 'Uploaded', type: 'success' })
      onUploaded?.()
    } catch (err) {
      toast({ title: 'Upload failed', message: err.message, type: 'error' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {documents.map((d) => (
          <div key={d.id || d.fileUrl} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] dark:border-slate-700">
            <span className="max-w-[8rem] truncate">{d.title || d.docType}</span>
            {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-primary">View</a>}
          </div>
        ))}
      </div>
      <label className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-primary/40 px-2 py-1 text-[10px] text-primary">
        <Upload className="h-3 w-3" />
        {uploading ? 'Uploading…' : '+ Upload More'}
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} />
      </label>
    </div>
  )
}

export function OpsPhotoGrid({ lrNumber, photos = [], onUploaded, uploadFn }) {
  const { toast } = useToast()

  const handleAdd = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadFn) return
    try {
      await uploadFn(lrNumber, file, 'Delivery Photo', file.name)
      toast({ title: 'Photo added', type: 'success' })
      onUploaded?.()
    } catch (err) {
      toast({ title: 'Upload failed', message: err.message, type: 'error' })
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-wrap gap-1">
      {photos.filter((d) => d.docType?.includes('Photo') || d.title?.match(/\.(jpg|jpeg|png|webp)$/i)).map((p) => (
        <div key={p.id} className="relative h-16 w-16 overflow-hidden rounded border border-slate-200">
          {p.fileUrl && <img src={p.fileUrl} alt="" className="h-full w-full object-cover" />}
        </div>
      ))}
      <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed border-primary/40 text-[10px] text-primary">
        + Add
        <input type="file" className="hidden" accept="image/*" onChange={handleAdd} />
      </label>
    </div>
  )
}

export function OpsTimeline({ rows = [] }) {
  if (!rows.length) {
    return <p className="text-[10px] text-slate-500">No history yet.</p>
  }
  return (
    <div className="lr-entry-items-scroll max-h-32">
      <table className="w-full text-[10px]">
        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
          <tr>
            {['Date & Time', 'Status', 'Location', 'Updated By', 'Remarks'].map((h) => (
              <th key={h} className="px-1 py-1 text-left font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-1 py-0.5">{r.at}</td>
              <td className="px-1 py-0.5">{r.status}</td>
              <td className="px-1 py-0.5">{r.location}</td>
              <td className="px-1 py-0.5">{r.by}</td>
              <td className="px-1 py-0.5">{r.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DEFAULT_INVOICE_ITEMS = [
  { id: 1, particulars: 'Freight Charges', hsn: '996511', qty: 1, unit: 'Trip', rate: 0, gstPct: 18 },
  { id: 2, particulars: 'Loading Charges', hsn: '996511', qty: 1, unit: 'Trip', rate: 0, gstPct: 18 },
]

export function OpsInvoiceItemsTable({ items, onChange, lr }) {
  const rows = items?.length ? items : DEFAULT_INVOICE_ITEMS.map((r) => ({
    ...r,
    rate: r.particulars === 'Freight Charges' ? Number(lr?.freight || 0) : Number(lr?.loadingCharges || 0),
  }))

  const update = (idx, field, val) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    onChange?.(next)
  }

  const calc = (r) => {
    const amount = Number(r.qty || 1) * Number(r.rate || 0)
    const gstAmt = amount * Number(r.gstPct || 0) / 100
    return { amount, gstAmt, total: amount + gstAmt }
  }

  const totals = rows.reduce((s, r) => {
    const c = calc(r)
    return { amount: s.amount + c.amount, gst: s.gst + c.gstAmt, total: s.total + c.total }
  }, { amount: 0, gst: 0, total: 0 })

  return (
    <div className="lr-entry-items-scroll">
      <table className="w-full text-[10px]">
        <thead className="sticky top-0 bg-primary text-white">
          <tr>
            {['#', 'Particulars', 'HSN', 'Qty', 'Rate', 'Amount', 'GST%', 'GST Amt', 'Total', ''].map((h) => (
              <th key={h} className="px-1 py-1">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const c = calc(r)
            return (
              <tr key={r.id || i} className="border-t border-slate-100">
                <td className="px-1 py-0.5">{i + 1}</td>
                <td className="px-1 py-0.5"><input className="w-full min-w-[6rem] rounded border px-1" value={r.particulars} onChange={(e) => update(i, 'particulars', e.target.value)} /></td>
                <td className="px-1 py-0.5"><input className="w-16 rounded border px-1" value={r.hsn} onChange={(e) => update(i, 'hsn', e.target.value)} /></td>
                <td className="px-1 py-0.5"><input type="number" className="w-12 rounded border px-1" value={r.qty} onChange={(e) => update(i, 'qty', e.target.value)} /></td>
                <td className="px-1 py-0.5"><input type="number" className="w-16 rounded border px-1" value={r.rate} onChange={(e) => update(i, 'rate', e.target.value)} /></td>
                <td className="px-1 py-0.5">{c.amount.toFixed(2)}</td>
                <td className="px-1 py-0.5"><input type="number" className="w-10 rounded border px-1" value={r.gstPct} onChange={(e) => update(i, 'gstPct', e.target.value)} /></td>
                <td className="px-1 py-0.5">{c.gstAmt.toFixed(2)}</td>
                <td className="px-1 py-0.5">{c.total.toFixed(2)}</td>
                <td className="px-1 py-0.5"><button type="button" className="text-red-500" onClick={() => onChange?.(rows.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></button></td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="bg-slate-50 font-semibold">
          <tr>
            <td colSpan={5} className="px-1 py-1 text-right">Total</td>
            <td className="px-1 py-1">{totals.amount.toFixed(2)}</td>
            <td />
            <td className="px-1 py-1">{totals.gst.toFixed(2)}</td>
            <td className="px-1 py-1">{totals.total.toFixed(2)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      <Button size="sm" variant="outline" className="mt-1" onClick={() => onChange?.([...rows, { id: Date.now(), particulars: 'Other Charges', hsn: '996511', qty: 1, unit: 'Trip', rate: 0, gstPct: 18 }])}>+ Add Item</Button>
    </div>
  )
}

export function OpsExpenseSettlement({ form, onChange }) {
  const u = (k, v) => onChange?.({ ...form, [k]: v })
  return (
    <div className="grid gap-1 lg:grid-cols-2">
      <div className="lr-entry-section lr-entry-compact">
        <p className="mb-1 text-[10px] font-semibold uppercase text-primary">Advance Information</p>
        <div className="grid grid-cols-2 gap-1">
          <Input label="Advance Taken (₹)" type="number" value={form.advanceTaken} onChange={(e) => u('advanceTaken', e.target.value)} />
          <Input label="Advance Date" type="date" value={form.advanceDate} onChange={(e) => u('advanceDate', e.target.value)} />
          <Input label="Given By" value={form.givenBy} onChange={(e) => u('givenBy', e.target.value)} />
        </div>
      </div>
      <div className="lr-entry-section lr-entry-compact">
        <p className="mb-1 text-[10px] font-semibold uppercase text-primary">Payment / Settlement</p>
        <div className="grid grid-cols-2 gap-1">
          <Input label="Reimbursed (₹)" type="number" value={form.reimbursed} onChange={(e) => u('reimbursed', e.target.value)} />
          <Input label="Settlement Date" type="date" value={form.settlementDate} onChange={(e) => u('settlementDate', e.target.value)} />
          <Input label="Paid To" value={form.paidTo} onChange={(e) => u('paidTo', e.target.value)} />
          <Input label="Payment Mode" value={form.paymentMode} onChange={(e) => u('paymentMode', e.target.value)} />
        </div>
      </div>
    </div>
  )
}

export function useOpsExtended(initial = {}) {
  const [ext, setExt] = useState(initial)
  const merge = useCallback((patch) => setExt((e) => ({ ...e, ...patch })), [])
  return [ext, merge, setExt]
}

export const LOADING_CHECKLIST = [
  'All LR verified and matched',
  'All packages loaded as per LR',
  'Goods loaded in proper condition',
  'Vehicle cleaned & checked',
  'Load secured properly',
]
