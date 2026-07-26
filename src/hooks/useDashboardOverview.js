import { useCallback, useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../services/api'
import { formatCurrency } from '../components/ui/ReportFilters'

function formatLakhs(n) {
  const v = Number(n) || 0
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}

export function useDashboardOverview(refreshSeed = 0) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const overview = await dashboardApi.overview()
      setData(overview)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard overview')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [refreshSeed])

  useEffect(() => {
    load()
  }, [load])

  const kpiCards = useMemo(() => {
    const k = data?.kpis
    if (!k) return []
    return [
      { label: 'Total Bookings', value: String(k.totalBookings), icon: 'CalendarPlus', color: 'blue' },
      { label: 'Pending Bookings', value: String(k.pendingBookings), icon: 'Clock', color: 'amber' },
      { label: 'Active Trips', value: String(k.activeTrips), icon: 'Route', color: 'cyan' },
      { label: 'Vehicles In Transit', value: String(k.vehiclesInTransit), icon: 'Truck', color: 'indigo' },
      { label: 'Delivered Shipments', value: String(k.deliveredShipments), icon: 'PackageCheck', color: 'green' },
      { label: 'Pending Deliveries', value: String(k.pendingDeliveries), icon: 'Package', color: 'orange' },
      { label: 'Freight Revenue', value: formatLakhs(k.freightRevenue), icon: 'TrendingUp', color: 'emerald' },
      { label: 'Outstanding Payments', value: formatLakhs(k.outstandingPayments), icon: 'AlertCircle', color: 'red' },
      { label: 'Collection Summary', value: formatLakhs(k.collectionSummary), icon: 'Banknote', color: 'slate' },
      { label: 'Vehicle Utilisation', value: `${k.vehicleUtilisation}%`, icon: 'Gauge', color: 'violet' },
      { label: 'Driver Availability', value: `${k.driversAvailable}/${k.driversTotal}`, icon: 'UserCircle', color: 'blue' },
      { label: 'Pending Invoices', value: String(k.pendingInvoices), icon: 'FileText', color: 'amber' },
    ]
  }, [data])

  return {
    loading,
    error,
    refresh: load,
    data,
    kpiCards,
    branchSummary: data?.branchSummary ?? [],
    topCustomers: data?.topCustomers ?? [],
    topRoutes: data?.topRoutes ?? [],
    recentBookings: data?.recentBookings ?? [],
    recentDeliveries: data?.recentDeliveries ?? [],
    pendingInvoices: data?.pendingInvoices ?? [],
    alerts: data?.alerts ?? [],
    formatLakhs,
    formatCurrency,
  }
}
