import { Plus, Trash2 } from 'lucide-react'
import Button from '../../ui/Button'
import LocalSearchSelect from '../../ui/LocalSearchSelect'
import ItemMasterSelect from '../../masters/ItemMasterSelect'
import { formatCurrency } from '../../ui/ReportFilters'
import LrEntrySectionCard from './LrEntrySectionCard'

const PACKAGE_TYPES = ['Box', 'Carton', 'Coil', 'Bag', 'Pallet', 'Other']
export const ITEM_FIELD_KEYS = ['description', 'hsn', 'packageType', 'qty', 'weight', 'invoiceNo', 'invoiceDate', 'invoiceValue']

function numDisplay(value) {
  if (value === '' || value == null) return ''
  if (Number(value) === 0) return ''
  return value
}

export default function LrEntryItemsSection({
  items,
  itemTotals,
  gridRef,
  updateItem,
  patchItem,
  addItem,
  removeItem,
  errors = {},
}) {
  const packageCount = (items || []).filter((i) => i.description?.trim()).length

  return (
    <LrEntrySectionCard
      title="4. Item Details"
      id="lr-section-items"
      className="lr-entry-v2-section--paired lr-entry-v2-section--items"
      action={(
        <Button size="sm" variant="outline" icon={Plus} type="button" onClick={addItem}>
          Add Item
          <span className="lr-entry-v2-kbd">F7</span>
        </Button>
      )}
    >
      {errors.items ? <p className="mb-2 text-xs text-red-500">{errors.items}</p> : null}

      <div className="lr-entry-v2-items-body">
      <div
        ref={gridRef}
        className="lr-entry-v2-items-scroll"
        data-kbd-grid="true"
      >
        <table className="lr-entry-v2-items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Description *</th>
              <th>HSN</th>
              <th>Pkg Type</th>
              <th>Qty</th>
              <th>Weight (Kg)</th>
              <th>Invoice No.</th>
              <th>Invoice Date</th>
              <th>Value (₹)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((item, idx) => (
              <tr key={item.id}>
                <td>{idx + 1}</td>
                {ITEM_FIELD_KEYS.map((field, colIdx) => (
                  <td key={field} data-grid-row={idx} data-grid-col={colIdx} className={field === 'description' || field === 'packageType' ? 'lr-entry-v2-cell-lookup' : undefined}>
                    {field === 'description' ? (
                      <ItemMasterSelect
                        variant="dense"
                        valueId={item.itemId}
                        displayValue={item.description}
                        placeholder="Search item…"
                        onSelect={(row) => patchItem(idx, {
                          itemId: row.id,
                          description: row.name,
                          hsn: row.hsn ?? '',
                          ...(row.defaultPackageType ? { packageType: row.defaultPackageType } : {}),
                        })}
                      />
                    ) : field === 'packageType' ? (
                      <LocalSearchSelect
                        label={false}
                        variant="dense"
                        options={PACKAGE_TYPES}
                        value={item.packageType}
                        onChange={(v) => updateItem(idx, field, v)}
                        placeholder="Package type"
                      />
                    ) : (
                      <input
                        type={field === 'qty' || field === 'weight' || field === 'invoiceValue' ? 'number' : field === 'invoiceDate' ? 'date' : 'text'}
                        step={field === 'weight' ? '0.001' : undefined}
                        className="lr-entry-v2-cell-input"
                        value={field === 'qty' || field === 'weight' || field === 'invoiceValue'
                          ? numDisplay(item[field])
                          : (item[field] ?? '')}
                        onChange={(e) => updateItem(idx, field, e.target.value)}
                        aria-label={`Row ${idx + 1} ${field}`}
                        placeholder={field === 'description' ? 'Item description' : undefined}
                      />
                    )}
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    className="lr-entry-v2-row-delete"
                    onClick={() => removeItem(idx)}
                    aria-label={`Delete item ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lr-entry-v2-item-summary">
        <div className="lr-entry-v2-summary-card">
          <span className="lr-entry-v2-summary-label">Total Packages</span>
          <span className="lr-entry-v2-summary-value">{packageCount}</span>
        </div>
        <div className="lr-entry-v2-summary-card">
          <span className="lr-entry-v2-summary-label">Total Quantity</span>
          <span className="lr-entry-v2-summary-value">{itemTotals.qty}</span>
        </div>
        <div className="lr-entry-v2-summary-card">
          <span className="lr-entry-v2-summary-label">Total Weight</span>
          <span className="lr-entry-v2-summary-value">{itemTotals.weight.toFixed(3)} Kg</span>
        </div>
        <div className="lr-entry-v2-summary-card lr-entry-v2-summary-card--accent">
          <span className="lr-entry-v2-summary-label">Total Invoice Value</span>
          <span className="lr-entry-v2-summary-value">{formatCurrency(itemTotals.invoiceValue)}</span>
        </div>
      </div>
      </div>
    </LrEntrySectionCard>
  )
}
