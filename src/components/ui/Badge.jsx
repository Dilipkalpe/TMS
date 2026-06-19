export default function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    primary: 'bg-primary/10 text-primary',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

export function statusVariant(status) {
  const map = {
    Active: 'success',
    Confirmed: 'info',
    Delivered: 'success',
    'In Transit': 'warning',
    Pending: 'warning',
    Cancelled: 'danger',
    Maintenance: 'danger',
    'On Leave': 'warning',
    Paid: 'success',
    Partial: 'warning',
    Unpaid: 'danger',
    Approved: 'success',
  }
  return map[status] || 'default'
}
