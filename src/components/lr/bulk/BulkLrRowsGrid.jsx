import { Copy, FileSpreadsheet, Plus, Trash2 } from 'lucide-react'
import ItemMasterSelect from '../../masters/ItemMasterSelect'
import { formatCurrency } from '../../ui/ReportFilters'
import {
  BULK_LR_FIELD_KEYS,
  emptyBulkRow,
  isBulkRowFilled,
  summarizeBulkRows,
} from './bulkLrModel'

function numDisplay(value) {
  if (value === '' || value == null) return ''
  if (Number(value) === 0) return ''
  return value
}

export default function BulkLrRowsGrid({
  rows,
  gridRef,
  autoCalculate = true,
  onAddRow,
  onImportClick,
  onUpdateCell,
  onPatchRow,
  onCopyRow,
  onRemoveRow,
}) {
  const summary = summarizeBulkRows(rows, autoCalculate)

  return (
    <section className="bulk-lr-grid-section">
      <div className="bulk-lr-section-head bulk-lr-grid-head">
        <div>
          <h2>LR Items</h2>
          <p>Each filled row creates one LR</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="bulk-lr-btn" onClick={onAddRow}>
            <Plus className="h-4 w-4" />
            Add Row
            <span className="bulk-lr-kbd">F7</span>
          </button>
          <button type="button" className="bulk-lr-btn" onClick={onImportClick}>
            <FileSpreadsheet className="h-4 w-4" />
            Import from Excel
          </button>
        </div>
      </div>

      <div ref={gridRef} className="bulk-lr-grid-scroll" data-kbd-grid="true">
        <table className="bulk-lr-grid-table">
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Invoice No. / Ref</th>
              <th>Item Name / Description</th>
              <th>Packages</th>
              <th>Actual Wt (Kg)</th>
              <th>Charged Wt (Kg)</th>
              <th>Rate (₹/Kg)</th>
              <th>Freight (₹)</th>
              <th>Value (₹)</th>
              <th>E-Way Bill No.</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row, idx) => (
              <tr key={row.id} className={isBulkRowFilled(row) ? 'bulk-lr-row-filled' : undefined}>
                <td className="bulk-lr-sr">{idx + 1}</td>
                {BULK_LR_FIELD_KEYS.map((field, colIdx) => (
                  <td
                    key={field}
                    data-grid-row={idx}
                    data-grid-col={colIdx}
                    className={field === 'description' ? 'bulk-lr-cell-lookup' : undefined}
                  >
                    {field === 'description' ? (
                      <ItemMasterSelect
                        variant="dense"
                        valueId={row.itemId}
                        displayValue={row.description}
                        placeholder="Search item…"
                        onSelect={(item) => onPatchRow(idx, {
                          itemId: item.id,
                          description: item.name,
                        })}
                      />
                    ) : (
                      <input
                        className={`bulk-lr-cell-input ${['packages', 'actualWeight', 'chargedWeight', 'rate', 'freight', 'value'].includes(field) ? 'bulk-lr-cell-num' : ''}`}
                        type={['packages', 'actualWeight', 'chargedWeight', 'rate', 'freight', 'value'].includes(field) ? 'number' : 'text'}
                        value={['packages', 'actualWeight', 'chargedWeight', 'rate', 'freight', 'value'].includes(field)
                          ? numDisplay(row[field])
                          : (row[field] ?? '')}
                        placeholder={{
                          invoiceNo: 'Scan / type',
                          packages: '0',
                          actualWeight: '0.00',
                          chargedWeight: '0.00',
                          rate: '0.00',
                          freight: '0.00',
                          value: '0',
                          ewayBillNo: 'Optional',
                        }[field] || ''}
                        onChange={(e) => onUpdateCell(idx, field, e.target.value)}
                        readOnly={field === 'freight' && autoCalculate && Number(row.rate) > 0 && Number(row.chargedWeight) > 0}
                      />
                    )}
                  </td>
                ))}
                <td className="bulk-lr-row-actions">
                  <button type="button" title="Copy row" className="bulk-lr-icon-btn" onClick={() => onCopyRow(idx)}>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" title="Delete row" className="bulk-lr-icon-btn bulk-lr-icon-danger" onClick={() => onRemoveRow(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Totals ({summary.totalLrs} LR)</td>
              <td>{summary.totalPackages || '—'}</td>
              <td colSpan={2}>{summary.totalWeight ? summary.totalWeight.toFixed(2) : '—'}</td>
              <td />
              <td>{summary.totalFreight ? formatCurrency(summary.totalFreight) : '—'}</td>
              <td>{summary.totalValue ? formatCurrency(summary.totalValue) : '—'}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="bulk-lr-grid-hint">
        Tip: Tab / arrows move cells · Ctrl+D duplicates · Freight auto = Rate × Charged Wt
        {autoCalculate ? '' : ' (auto-calc off)'}
      </p>
    </section>
  )
}

export { emptyBulkRow }
