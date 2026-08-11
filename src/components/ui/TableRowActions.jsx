import * as Icons from 'lucide-react'

const VARIANT_CLASS = {
  primary: 'rounded bg-primary text-white hover:bg-primary-dark',
  outline: 'rounded border border-primary/40 bg-white text-primary hover:bg-primary/10 dark:bg-slate-800',
  danger: 'rounded border border-red-300 bg-white text-red-500 hover:bg-red-50 dark:bg-slate-800',
  muted: 'rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800',
}

/**
 * Icon-only row actions with tooltip (title attribute).
 * @param {{ id, icon, label, onClick, variant?, hidden?, disabled? }[]} actions
 * @param {object} row
 */
export default function TableRowActions({ actions = [], row, size = 'md' }) {
  const btnClass = size === 'sm'
    ? 'inline-flex h-7 w-7 shrink-0 items-center justify-center'
    : 'inline-flex h-8 w-8 shrink-0 items-center justify-center'
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  const visible = actions.filter((a) => !a.hidden?.(row) && !a.disabled?.(row))
  if (!visible.length) return null

  return (
    <div className="flex items-center justify-start gap-1" onClick={(e) => e.stopPropagation()}>
      {visible.map((action) => {
        const Icon = typeof action.icon === 'string' ? (Icons[action.icon] || Icons.Circle) : action.icon
        const variant = action.variant ?? (action.id === 'delete' ? 'danger' : action.id === 'print' ? 'primary' : 'outline')
        return (
          <button
            key={action.id}
            type="button"
            title={action.label}
            aria-label={action.label}
            disabled={action.disabled?.(row)}
            onClick={() => action.onClick?.(row)}
            className={`${btnClass} ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.outline} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <Icon className={iconClass} />
          </button>
        )
      })}
    </div>
  )
}

/** Build standard view/edit/delete/print actions from ERPListPage callbacks. */
export function buildStandardRowActions({ onView, onEdit, onDelete, onPrint, printTitle = 'Print', canEdit, canDelete, canView, canPrint }) {
  const actions = []
  if (onView) {
    actions.push({
      id: 'view',
      icon: Icons.Eye,
      label: 'View',
      onClick: onView,
      hidden: canView ? (row) => !canView(row) : undefined,
    })
  }
  if (onPrint) {
    actions.push({
      id: 'print',
      icon: Icons.Printer,
      label: printTitle,
      onClick: onPrint,
      variant: 'primary',
      hidden: canPrint ? (row) => !canPrint(row) : undefined,
    })
  }
  if (onEdit) {
    actions.push({
      id: 'edit',
      icon: Icons.Pencil,
      label: 'Edit',
      onClick: onEdit,
      hidden: canEdit ? (row) => !canEdit(row) : undefined,
    })
  }
  if (onDelete) {
    actions.push({
      id: 'delete',
      icon: Icons.Trash2,
      label: 'Delete',
      onClick: onDelete,
      variant: 'danger',
      hidden: canDelete ? (row) => !canDelete(row) : undefined,
    })
  }
  return actions
}
