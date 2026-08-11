function SummaryItem({ label, value, highlight = false }) {
  return (
    <span className={`lr-entry-v2-fin-item${highlight ? ' is-highlight' : ''}`}>
      <span className="lr-entry-v2-fin-label">{label}</span>
      <span className="lr-entry-v2-fin-value">{value}</span>
    </span>
  )
}

export default function InTransitSummary({
  packages,
  weight,
  status,
  location,
}) {
  return (
    <div className="lr-entry-v2-financial-summary" aria-label="In transit summary">
      <SummaryItem label="Packages" value={String(packages)} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Weight" value={`${weight} Kg`} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Status" value={status} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Location" value={location || '—'} highlight />
    </div>
  )
}
