import { FileText, Trash2, Upload } from 'lucide-react'
import { formatCurrency } from '../../ui/ReportFilters'
import { isBulkRowFilled } from './bulkLrModel'

export default function BulkLrBottomPanels({
  remarks,
  onRemarksChange,
  documents = [],
  onAddDocuments,
  onRemoveDocument,
  common,
  rows = [],
  summary,
}) {
  const first = (rows || []).find(isBulkRowFilled)

  return (
    <div className="bulk-lr-bottom">
      <section className="bulk-lr-panel">
        <h3>Remarks</h3>
        <textarea
          className="bulk-lr-remarks"
          rows={4}
          maxLength={500}
          value={remarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          placeholder="Notes applied to all LRs in this batch…"
        />
      </section>

      <section className="bulk-lr-panel">
        <h3>Documents (optional)</h3>
        <label className="bulk-lr-upload">
          <Upload className="h-4 w-4" />
          <span>Attach files (stored locally for this session)</span>
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              if (files.length) onAddDocuments(files)
              e.target.value = ''
            }}
          />
        </label>
        <ul className="bulk-lr-doc-list">
          {documents.length === 0 ? (
            <li className="bulk-lr-muted">No files attached</li>
          ) : documents.map((doc) => (
            <li key={doc.id}>
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">{doc.name}</span>
              <span className="bulk-lr-muted">{doc.sizeLabel}</span>
              <button type="button" className="bulk-lr-icon-btn bulk-lr-icon-danger" onClick={() => onRemoveDocument(doc.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="bulk-lr-panel">
        <div className="flex items-center justify-between gap-2">
          <h3>LR Preview (first)</h3>
        </div>
        {first ? (
          <dl className="bulk-lr-preview">
            <div><dt>LR No</dt><dd>Auto</dd></div>
            <div><dt>Date</dt><dd>{common.lrDate || '—'}</dd></div>
            <div><dt>From</dt><dd>{common.from || '—'}</dd></div>
            <div><dt>To</dt><dd>{common.to || '—'}</dd></div>
            <div><dt>Consignor</dt><dd>{common.consignor || '—'}</dd></div>
            <div><dt>Consignee</dt><dd>{common.consignee || '—'}</dd></div>
            <div><dt>Invoice</dt><dd>{first.invoiceNo || '—'}</dd></div>
            <div><dt>Item</dt><dd>{first.description || '—'}</dd></div>
            <div><dt>Freight</dt><dd>{formatCurrency(Number(first.freight) || 0)}</dd></div>
          </dl>
        ) : (
          <p className="bulk-lr-muted">Fill at least one grid row to preview.</p>
        )}
      </section>

      <section className="bulk-lr-panel">
        <h3>Summary (all LRs)</h3>
        <ul className="bulk-lr-summary">
          <li><span>Total LRs</span><strong>{summary.totalLrs}</strong></li>
          <li><span>Total Packages</span><strong>{summary.totalPackages}</strong></li>
          <li><span>Total Weight</span><strong>{summary.totalWeight ? `${summary.totalWeight.toFixed(2)} kg` : '0'}</strong></li>
          <li><span>Total Freight</span><strong>{formatCurrency(summary.totalFreight)}</strong></li>
          <li><span>Total Value</span><strong>{formatCurrency(summary.totalValue)}</strong></li>
        </ul>
      </section>
    </div>
  )
}
