/** Shared validation for Expense Management supporting documents. */

export const EXPENSE_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
export const EXPENSE_ATTACHMENT_MAX_FILES = 10

export const EXPENSE_ATTACHMENT_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'])

export function getFileExtension(name = '') {
  const i = String(name).lastIndexOf('.')
  return i >= 0 ? String(name).slice(i + 1).toLowerCase() : ''
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

/** @returns {string|null} error message or null if valid */
export function validateExpenseAttachmentFile(file) {
  if (!file) return 'No file selected.'
  const ext = getFileExtension(file.name)
  if (!ALLOWED_EXT.has(ext)) {
    return 'Allowed types: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX.'
  }
  if (file.size > EXPENSE_ATTACHMENT_MAX_BYTES) {
    return 'File exceeds the 5 MB maximum size.'
  }
  return null
}
