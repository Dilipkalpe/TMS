import { useCallback, useEffect, useState } from 'react'

export function useApiResource(fetcher, deps = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (Array.isArray(result)) setData(result)
      else if (result?.items) setData(result.items)
      else setData(result ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [fetcher, ...deps])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh, setData }
}

export function useApiItem(fetcher, id, deps = []) {
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetcher(id)
      setItem(res)
    } catch (err) {
      setError(err.message)
      setItem(null)
    } finally {
      setLoading(false)
    }
  }, [fetcher, id, ...deps])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { item, loading, error, setItem, refresh }
}

export function useApiObject(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result ?? null)
    } catch (err) {
      setError(err.message || 'Failed to load data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fetcher, ...deps])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh, setData }
}
