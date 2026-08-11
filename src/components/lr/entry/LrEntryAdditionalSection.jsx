import { CloudUpload, X } from 'lucide-react'
import { Textarea } from '../../ui/Input'
import LrEntrySectionCard from './LrEntrySectionCard'

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LrEntryAdditionalSection({ form, update }) {
  const attachments = form.attachments || []

  const removeAttachment = (index) => {
    update('attachments', attachments.filter((_, i) => i !== index))
  }

  return (
    <LrEntrySectionCard title="6. Additional Information" id="lr-section-additional">
      <Textarea
        label={`Remarks (${(form.remarks || '').length}/500)`}
        rows={4}
        maxLength={500}
        value={form.remarks}
        onChange={(e) => update('remarks', e.target.value)}
        placeholder="Optional notes for this LR…"
      />

      <div className="lr-entry-v2-docs mt-4">
        <p className="lr-entry-v2-docs-title">Documents</p>
        <label className="lr-entry-v2-attach-btn">
          <CloudUpload className="h-4 w-4" />
          Attach File
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => update('attachments', [...attachments, ...Array.from(e.target.files || [])])}
          />
        </label>

        {attachments.length > 0 ? (
          <ul className="lr-entry-v2-doc-list">
            {attachments.map((file, i) => (
              <li key={`${file.name}-${i}`} className="lr-entry-v2-doc-item">
                <div className="min-w-0">
                  <p className="truncate font-medium">{file.name}</p>
                  {file.size ? <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p> : null}
                </div>
                <button
                  type="button"
                  className="lr-entry-v2-doc-remove"
                  onClick={() => removeAttachment(i)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">No documents attached.</p>
        )}
      </div>
    </LrEntrySectionCard>
  )
}
