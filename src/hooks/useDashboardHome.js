import { useCallback, useEffect, useRef, useState } from 'react'
import { dashboardApi } from '../services/api'
import { defaultDashboardDateRange } from '../utils/dashboardDateRange'

/** Always send a bounded range — empty dates historically triggered all-time scans (~500k LRs). */
function resolveHomeDates(dateFrom, dateTo) {
  if (dateFrom && dateTo) return { dateFrom, dateTo }
  const defaults = defaultDashboardDateRange()
  return {
    dateFrom: dateFrom || defaults.dateFrom,
    dateTo: dateTo || defaults.dateTo,
  }
}

export function useDashboardHome({ dateFrom, dateTo, refreshSeed = 0 } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadMs, setLoadMs] = useState(null)
  const hasData = useRef(false)

  const load = useCallback(async () => {
    if (!hasData.current) setLoading(true)
    setError(null)
    const started = performance.now()
    const range = resolveHomeDates(dateFrom, dateTo)
    try {
      const home = await dashboardApi.home(range)
      setData(home)
      hasData.current = true
      setLoadMs(Math.round(performance.now() - started))
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
      if (!hasData.current) setData(null)
      setLoadMs(null)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, refreshSeed])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, loadMs, refresh: load }
}
