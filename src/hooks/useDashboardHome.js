import { useCallback, useEffect, useState } from 'react'
import { dashboardApi } from '../services/api'

export function useDashboardHome(refreshSeed = 0) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const home = await dashboardApi.home()
      setData(home)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [refreshSeed])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}
