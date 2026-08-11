import { Filter, Plus } from 'lucide-react'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import Badge from '../../ui/Badge'
import { formatCurrency } from '../../ui/ReportFilters'
import BillingSectionCard from './BillingSectionCard'

export default function BillingSourceSection({
  queueRows,
  loading,
  selected,
  onToggle,
  onToggleAll,
  onOpenFilter,
  search,
  onSearchChange,
  filterCount,
}) {
  const selectedRows = queueRows.filter((r) => selected.has(r.lrNumber))
  const totalFreight = selectedRows.reduce((s, r) => s + Number(r.freight || 0), 0)

  return (
    <BillingSectionCard
      title="Billing source"
      subtitle="Select unbilled LR / trip / booking rows to invoice"
      id="billing-section-source"
      action={(
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={Filter} type="button" onClick={onOpenFilter}>
            Filter{filterCount ? ` (${filterCount})` : ''}
          </Button>
        </div>
      )}
    >
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Input
          label="Search LR / Trip / Booking"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="LR number, customer, route…"
          className="min-w-[14rem] flex-1"
        />
        <Button size="sm" variant="outline" icon={Plus} type="button" disabled>
          Add Trip
        </Button>
        <Button size="sm" variant="outline" icon={Plus} type="button" disabled>
          Add Booking
        </Button>
      </div>

      <div className="billing-v2-items-scroll">
        <table className="billing-v2-items-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={queueRows.length > 0 && selected.size === queueRows.length}
                  onChange={onToggleAll}
                  aria-label="Select all"
                />
              </th>
              {['LR No.', 'LR Date', 'From', 'To', 'Vehicle No.', 'Freight', 'Status', 'Billing Status', 'Total'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="py-6 text-center text-sm text-slate-500">Loading unbilled records…</td></tr>
            ) : queueRows.length === 0 ? (
              <tr><td colSpan={10} className="py-6 text-center text-sm text-slate-500">No billing-eligible LR found.</td></tr>
            ) : queueRows.map((r) => {
              const billed = String(r.billingStatus || '').toLowerCase() === 'billed'
              return (
                <tr key={r.lrNumber} className={billed ? 'opacity-50' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(r.lrNumber)}
                      disabled={billed}
                      onChange={() => onToggle(r.lrNumber)}
                      aria-label={`Select ${r.lrNumber}`}
                    />
                  </td>
                  <td className="font-semibold">{r.lrNumber}</td>
                  <td>{r.lrDate || '—'}</td>
                  <td>{r.from || '—'}</td>
                  <td>{r.to || '—'}</td>
                  <td>{r.vehicle || '—'}</td>
                  <td>{formatCurrency(r.freight)}</td>
                  <td><Badge variant="success">{r.status || 'Delivered'}</Badge></td>
                  <td><Badge variant={billed ? 'success' : 'warning'}>{r.billingStatus || 'Unbilled'}</Badge></td>
                  <td>{formatCurrency(Number(r.freight || 0) + Number(r.gst || 0))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected.size > 1 && (
        <p className="billing-v2-multi-hint">
          Multiple LRs selected — the system creates <strong>one invoice per LR</strong> (existing API). Line items are generated per LR on save.
        </p>
      )}
      <div className="billing-v2-source-summary">
        <span>Total Selected Items: <strong>{selected.size}</strong></span>
        <span>Total Freight: <strong>{formatCurrency(totalFreight)}</strong></span>
      </div>
    </BillingSectionCard>
  )
}
