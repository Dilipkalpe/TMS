function SummaryItem({ label, value, highlight = false }) {
  return (
    <span className={`lr-entry-v2-fin-item${highlight ? ' is-highlight' : ''}`}>
      <span className="lr-entry-v2-fin-label">{label}</span>
      <span className="lr-entry-v2-fin-value">{value}</span>
    </span>
  )
}

export default function TransitPassSummary({
  lrCount,
  packages,
  chargedWeight,
  status,
}) {
  return (
    <div className="lr-entry-v2-financial-summary" aria-label="Transit pass summary">
      <SummaryItem label="LR Count" value={String(lrCount)} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Packages" value={String(packages)} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Chg. Wt" value={`${chargedWeight} Kg`} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Status" value={status} highlight />
    </div>
  )
}
