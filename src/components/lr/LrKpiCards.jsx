import StatusSummaryCards from '../ui/StatusSummaryCards'
import { LR_KPI_CARDS } from '../../constants/lrStatusNavigation'

export default function LrKpiCards({ summary = {}, onSelectStage }) {
  const cards = LR_KPI_CARDS.map((kpi) => ({
    label: kpi.label,
    count: summary[kpi.field] ?? 0,
    icon: kpi.icon,
    color: kpi.color,
    onClick: onSelectStage ? () => onSelectStage(kpi.stage) : undefined,
  }))

  return (
    <div className="mb-4">
      <StatusSummaryCards cards={cards} />
    </div>
  )
}
