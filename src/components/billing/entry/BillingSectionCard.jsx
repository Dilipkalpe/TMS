import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function BillingSectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className = '',
  id,
  collapsible = false,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (collapsible) {
    return (
      <section id={id} className={`loading-slip-section loading-slip-section--collapsible ${className}`}>
        <button
          type="button"
          className="loading-slip-section-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="flex min-w-0 items-start gap-2.5 text-left">
            {open
              ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
            {Icon ? (
              <span className="loading-slip-section-icon">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <span className="min-w-0">
              {title ? <span className="loading-slip-section-title block">{title}</span> : null}
              {subtitle ? <span className="loading-slip-section-sub block">{subtitle}</span> : null}
            </span>
          </span>
          {action ? <span onClick={(e) => e.stopPropagation()}>{action}</span> : null}
        </button>
        {open ? <div className="loading-slip-section-body">{children}</div> : null}
      </section>
    )
  }

  return (
    <section id={id} className={`loading-slip-section ${className}`}>
      {(title || action) && (
        <div className="loading-slip-section-head">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon ? (
              <span className="loading-slip-section-icon">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <h2 className="loading-slip-section-title">{title}</h2> : null}
              {subtitle ? <p className="loading-slip-section-sub">{subtitle}</p> : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  )
}
