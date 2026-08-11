function SummaryItem({ label, value, highlight = false }) {
  return (
    <span className={`lr-entry-v2-fin-item${highlight ? ' is-highlight' : ''}`}>
      <span className="lr-entry-v2-fin-label">{label}</span>
      <span className="lr-entry-v2-fin-value">{value}</span>
    </span>
  )
}

export default function LoadingSlipSummary({
  totalLr,
  loaded,
  packages,
  actualWeight,
  chargedWeight,
}) {
  return (
    <div className="lr-entry-v2-financial-summary" aria-label="Loading slip summary">
      <SummaryItem label="Total LR" value={String(totalLr)} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Loaded" value={loaded} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Packages" value={String(packages)} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Act. Wt" value={`${actualWeight} Kg`} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Chg. Wt" value={`${chargedWeight} Kg`} highlight />
    </div>
  )
}
