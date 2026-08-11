import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { CheckCircle2, ScanLine, Trash2 } from 'lucide-react'

export default function LoadingSlipLrTable({ rows, totals, onToggleLoaded, onDelete }) {
  if (!rows?.length) {
    return (
      <div className="loading-slip-empty-table rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-900/50">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No LR selected</p>
        <p className="mt-1 text-xs text-slate-500">Click <strong>Add LR</strong> to select single or multiple LRs for this loading slip.</p>
      </div>
    )
  }

  return (
    <div className="loading-slip-table-wrap overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="loading-slip-table w-full min-w-[980px] text-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>LR No.</th>
            <th>LR Date</th>
            <th>Customer / Consignee</th>
            <th>Destination</th>
            <th className="text-right">Items</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Weight (Kg)</th>
            <th>Status</th>
            <th className="text-center">Verify</th>
            <th className="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.lrNumber || i} className={r.loaded ? 'loading-slip-row--loaded' : ''}>
              <td className="text-slate-500">{i + 1}</td>
              <td className="font-semibold text-primary">{r.lrNumber}</td>
              <td>{r.lrDate}</td>
              <td>
                <span className="font-medium text-slate-800 dark:text-slate-100">{r.customer}</span>
                {r.consignee && r.consignee !== r.customer && (
                  <span className="block text-xs text-slate-500">{r.consignee}</span>
                )}
              </td>
              <td>{r.destination}</td>
              <td className="text-right tabular-nums">{r.items ?? '—'}</td>
              <td className="text-right tabular-nums">{r.packages}</td>
              <td className="text-right tabular-nums">{r.actualWeight}</td>
              <td>
                <Badge variant={r.loaded ? 'Paid' : 'Pending'}>
                  {r.loaded ? 'Loaded' : 'Pending'}
                </Badge>
              </td>
              <td className="text-center">
                <button
                  type="button"
                  className={`loading-slip-verify-btn ${r.loaded ? 'loading-slip-verify-btn--done' : ''}`}
                  onClick={() => onToggleLoaded?.(i)}
                  aria-label={r.loaded ? 'Mark pending' : 'Mark loaded'}
                  title={r.loaded ? 'Mark as pending' : 'Mark as loaded'}
                >
                  {r.loaded ? <CheckCircle2 className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
                </button>
              </td>
              <td className="text-center">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Trash2}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => onDelete?.(i, r)}
                  aria-label={`Remove ${r.lrNumber}`}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr>
              <td colSpan={5} className="text-right font-semibold">Total</td>
              <td className="text-right tabular-nums font-semibold">{totals.itemCount ?? '—'}</td>
              <td className="text-right tabular-nums font-semibold">{totals.packages}</td>
              <td className="text-right tabular-nums font-semibold">{totals.actualWeight}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
