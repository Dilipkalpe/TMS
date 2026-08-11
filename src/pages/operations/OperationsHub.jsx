import { useEffect, useState } from 'react'
import CommandCenterHub from '../../components/ui/CommandCenterHub'
import { operationsHubSections, operationsQuickActions } from '../../config/operationsHub'
import { useSubscription } from '../../context/SubscriptionContext'
import { analyticsApi, documentsApi } from '../../services/api'
import { formatCurrency } from '../../components/ui/ReportFilters'

function formatShortMoney(n) {
  const v = Number(n || 0)
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`
  return formatCurrency(v)
}

export default function OperationsHub() {
  const { canAccessPath } = useSubscription()
  const [overview, setOverview] = useState(null)
  const [docsExpiring, setDocsExpiring] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      analyticsApi.overview().catch(() => null),
      documentsApi.expiring(30).catch(() => null),
    ]).then(([o, d]) => {
      if (cancelled) return
      setOverview(o)
      setDocsExpiring(d)
    })
    return () => { cancelled = true }
  }, [])

  const docCount = (docsExpiring?.documents?.length || 0) + (docsExpiring?.vehicleCompliance?.length || 0)

  return (
    <CommandCenterHub
      module="Operations"
      title="Operations"
      eyebrow="Command center"
      headline="Operations at a glance"
      description="Start from what needs attention today — then jump into fleet, compliance, or enterprise tools."
      quickActions={operationsQuickActions}
      canAccessPath={canAccessPath}
      iconFallback="Layers"
      columns="xl"
      sections={operationsHubSections}
      kpis={[
        {
          label: 'On trip',
          value: overview ? String(overview.vehiclesOnTrip ?? 0) : '—',
          hint: overview ? `of ${overview.vehicles ?? 0} vehicles` : 'Loading…',
          tone: 'ok',
        },
        {
          label: 'Open bookings',
          value: overview ? String(overview.openBookings ?? 0) : '—',
          hint: 'need ops follow-up',
          tone: 'warn',
        },
        {
          label: 'Fuel cost',
          value: overview ? formatShortMoney(overview.fuelCost) : '—',
          hint: overview ? `${Number(overview.fuelLiters || 0).toFixed(0)} L logged` : 'Loading…',
        },
        {
          label: 'Docs expiring',
          value: docsExpiring ? String(docCount) : '—',
          hint: 'next 30 days',
          tone: docCount > 0 ? 'warn' : 'default',
        },
      ]}
    />
  )
}
