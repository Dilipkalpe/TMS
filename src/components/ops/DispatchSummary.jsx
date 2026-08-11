function SummaryItem({ label, value, highlight = false }) {
  return (
    <span className={`lr-entry-v2-fin-item${highlight ? ' is-highlight' : ''}`}>
      <span className="lr-entry-v2-fin-label">{label}</span>
      <span className="lr-entry-v2-fin-value">{value}</span>
    </span>
  )
}

export default function DispatchSummary({
  packages,
  weight,
  passStatus,
  dispatchStatus,
}) {
  return (
    <div className="lr-entry-v2-financial-summary" aria-label="Dispatch summary">
      <SummaryItem label="Packages" value={String(packages)} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Weight" value={`${weight} Kg`} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Pass" value={passStatus} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <SummaryItem label="Dispatch" value={dispatchStatus} highlight />
    </div>
  )
}
