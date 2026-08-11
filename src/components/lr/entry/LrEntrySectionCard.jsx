/** Reusable card wrapper for LR Entry sections. */
export default function LrEntrySectionCard({ title, subtitle, action, children, className = '', id }) {
  return (
    <section id={id} className={`lr-entry-v2-section ${className}`}>
      {(title || action) && (
        <div className="lr-entry-v2-section-head">
          <div className="min-w-0">
            {title ? <h2 className="lr-entry-v2-section-title">{title}</h2> : null}
            {subtitle ? <p className="lr-entry-v2-section-sub">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  )
}
