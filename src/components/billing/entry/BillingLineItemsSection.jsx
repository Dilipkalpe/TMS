import { Plus, Trash2 } from 'lucide-react'
import Button from '../../ui/Button'
import { formatCurrency } from '../../ui/ReportFilters'
import BillingSectionCard from './BillingSectionCard'
import { calcBillingLine as calcLine } from '../../../utils/billingInvoiceUtils'

export default function BillingLineItemsSection({
  rows,
  onChange,
  onAddLine,
  gridRef,
  billType = 'FC',
  isInterstate = false,
}) {
  const update = (idx, field, val) => {
    onChange?.(rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
  }

  const totals = rows.reduce((s, r) => {
    const c = calcLine(r, billType, isInterstate)
    return {
      taxable: s.taxable + c.taxable,
      gst: s.gst + c.gstAmt,
      total: s.total + c.total,
    }
  }, { taxable: 0, gst: 0, total: 0 })

  const gstLabel = billType === 'RCM' ? '5% RCM' : '18%'

  return (
    <BillingSectionCard
      title="Invoice line items"
      subtitle="Freight and other charge lines for the selected LRs"
      id="billing-section-lines"
      action={(
        <Button size="sm" variant="outline" icon={Plus} type="button" onClick={onAddLine}>
          Add Line
          <span className="billing-v2-kbd">F7</span>
        </Button>
      )}
    >
      <div
        ref={gridRef}
        className="billing-v2-items-scroll"
        data-kbd-grid="true"
      >
        <table className="billing-v2-items-table">
          <thead>
            <tr>
              {['#', 'Charge Type', 'SAC', 'Description', 'Ref LR', 'Qty', 'Unit', 'Rate', 'Taxable', `GST ${gstLabel}`, 'CGST', 'SGST', 'IGST', 'Total', ''].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = calcLine(r, billType, isInterstate)
              return (
                <tr key={r.id || i}>
                  <td>{i + 1}</td>
                  <td><input className="billing-v2-cell" value={r.chargeType || r.particulars || ''} onChange={(e) => update(i, 'particulars', e.target.value)} /></td>
                  <td><input className="billing-v2-cell billing-v2-cell--sm" value={r.hsn || ''} onChange={(e) => update(i, 'hsn', e.target.value)} /></td>
                  <td><input className="billing-v2-cell billing-v2-cell--wide" value={r.description || r.particulars || ''} onChange={(e) => update(i, 'description', e.target.value)} /></td>
                  <td><input className="billing-v2-cell" value={r.lrRef || ''} onChange={(e) => update(i, 'lrRef', e.target.value)} /></td>
                  <td><input type="number" className="billing-v2-cell billing-v2-cell--sm" value={r.qty ?? 1} onChange={(e) => update(i, 'qty', e.target.value)} /></td>
                  <td><input className="billing-v2-cell billing-v2-cell--sm" value={r.unit || 'Trip'} onChange={(e) => update(i, 'unit', e.target.value)} /></td>
                  <td><input type="number" className="billing-v2-cell" value={r.rate ?? ''} onChange={(e) => update(i, 'rate', e.target.value)} /></td>
                  <td>{formatCurrency(c.taxable)}</td>
                  <td><input type="number" className="billing-v2-cell billing-v2-cell--sm" value={r.gstPct ?? c.gstPct} onChange={(e) => update(i, 'gstPct', e.target.value)} readOnly={billType === 'RCM'} title={billType === 'RCM' ? 'RCM rate fixed at 5%' : undefined} /></td>
                  <td>{formatCurrency(c.cgst)}</td>
                  <td>{formatCurrency(c.sgst)}</td>
                  <td>{formatCurrency(c.igst)}</td>
                  <td>{formatCurrency(c.total)}</td>
                  <td>
                    <button type="button" className="text-red-500" onClick={() => onChange?.(rows.filter((_, j) => j !== i))} aria-label="Delete line">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8} className="text-right font-semibold">Totals</td>
              <td>{formatCurrency(totals.taxable)}</td>
              <td />
              <td colSpan={3} />
              <td className="font-bold text-primary">{formatCurrency(totals.total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </BillingSectionCard>
  )
}

export { calcLine as calcBillingLine }
