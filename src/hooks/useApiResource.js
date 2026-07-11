import { useCallback, useEffect, useRef, useState } from 'react'

/** Keep latest fetcher without retriggering effects when parent passes inline arrows. */
function useStableFetcher(fetcher) {
  const ref = useRef(fetcher)
  ref.current = fetcher
  return useCallback((...args) => ref.current(...args), [])
}

export function useApiResource(fetcher, deps = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const stableFetch = useStableFetcher(fetcher)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await stableFetch()
      if (Array.isArray(result)) setData(result)
      else if (result?.items) setData(result.items)
      else setData(result ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [stableFetch, ...deps])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh, setData }
}

export function useApiItem(fetcher, id, deps = []) {
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const stableFetch = useStableFetcher(fetcher)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await stableFetch(id)
      setItem(res)
    } catch (err) {
      setError(err.message)
      setItem(null)
    } finally {
      setLoading(false)
    }
  }, [stableFetch, id, ...deps])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { item, loading, error, setItem, refresh }
}

export function useApiObject(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const stableFetch = useStableFetcher(fetcher)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await stableFetch()
      setData(result ?? null)
    } catch (err) {
      setError(err.message || 'Failed to load data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [stableFetch, ...deps])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh, setData }
}
