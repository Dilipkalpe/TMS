import { useRef, useState } from 'react'
import { FileText, Trash2, Upload, Eye, Loader2 } from 'lucide-react'
import Button from '../ui/Button'
import {
  EXPENSE_ATTACHMENT_ACCEPT,
  EXPENSE_ATTACHMENT_MAX_FILES,
  formatFileSize,
  getFileExtension,
  validateExpenseAttachmentFile,
} from '../../utils/expenseAttachments'

/**
 * Supporting document picker for Expense Management.
 * - pending mode: collect local File objects before expense is saved
 * - saved mode: list/download/delete server attachments
 */
export default function ExpenseAttachmentField({
  pendingFiles = [],
  onPendingChange,
  savedAttachments = [],
  onView,
  onRemoveSaved,
  disabled = false,
  uploading = false,
}) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || [])
    if (!incoming.length) return
    setError('')
    const next = [...pendingFiles]
    for (const file of incoming) {
      const err = validateExpenseAttachmentFile(file)
      if (err) {
        setError(err)
        continue
      }
      if (next.length + savedAttachments.length >= EXPENSE_ATTACHMENT_MAX_FILES) {
        setError(`Maximum ${EXPENSE_ATTACHMENT_MAX_FILES} documents per expense.`)
        break
      }
      const dup = next.some((f) => f.name === file.name && f.size === file.size)
      if (!dup) next.push(file)
    }
    onPendingChange?.(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  const removePending = (index) => {
    onPendingChange?.(pendingFiles.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3 sm:col-span-2 lg:col-span-3">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Supporting Document / Attachment</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Optional. PDF, JPG, PNG, DOC, DOCX, XLS, XLSX — max 5 MB each (up to {EXPENSE_ATTACHMENT_MAX_FILES} files).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800 ${disabled || uploading ? 'pointer-events-none opacity-50' : ''}`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Choose File
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={EXPENSE_ATTACHMENT_ACCEPT}
            multiple
            disabled={disabled || uploading}
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
        {pendingFiles.length > 0 && (
          <span className="text-xs text-slate-500">{pendingFiles.length} file(s) ready to upload on save</span>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {(pendingFiles.length > 0 || savedAttachments.length > 0) && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {savedAttachments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate font-medium">📄 {a.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {(a.fileExtension || getFileExtension(a.fileName) || 'file').toUpperCase()}
                    {' · '}
                    {formatFileSize(a.fileSize)}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="outline" className="!px-2 !py-1 text-xs" icon={Eye} onClick={() => onView?.(a)} disabled={disabled}>
                  View
                </Button>
                <Button type="button" variant="outline" className="!px-2 !py-1 text-xs" icon={Trash2} onClick={() => onRemoveSaved?.(a)} disabled={disabled}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
          {pendingFiles.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate font-medium">📄 {file.name}</p>
                  <p className="text-xs text-slate-500">
                    {getFileExtension(file.name).toUpperCase() || 'FILE'}
                    {' · '}
                    {formatFileSize(file.size)}
                    {' · '}
                    <span className="text-amber-600">Pending upload</span>
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline" className="!px-2 !py-1 text-xs" icon={Trash2} onClick={() => removePending(index)} disabled={disabled}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
