/** Shared Branch column for list/grid screens. */

export const BRANCH_COLUMN = {
  key: 'branchName',
  label: 'Branch',
  nowrap: true,
  render: (r) => r.branchName || r.branch || r.BranchName || '—',
}

/**
 * Insert Branch into a column definition.
 * @param {Array} columns
 * @param {{ afterKey?: string, beforeKey?: string }} [opts]
 *   afterKey — insert immediately after this column key (preferred)
 *   beforeKey — insert immediately before this column key
 *   If neither matches, Branch is inserted after the first column.
 */
export function withBranchColumn(columns = [], opts = {}) {
  if (columns.some((c) => c?.key === 'branchName' || c?.key === 'branch')) {
    return columns
  }

  const { afterKey, beforeKey } = opts
  const next = [...columns]

  if (beforeKey) {
    const i = next.findIndex((c) => c?.key === beforeKey)
    if (i >= 0) {
      next.splice(i, 0, BRANCH_COLUMN)
      return next
    }
  }

  if (afterKey) {
    const i = next.findIndex((c) => c?.key === afterKey)
    if (i >= 0) {
      next.splice(i + 1, 0, BRANCH_COLUMN)
      return next
    }
  }

  // Default: after first identity/date-ish column
  const afterFirst = Math.min(1, next.length)
  next.splice(afterFirst, 0, BRANCH_COLUMN)
  return next
}
