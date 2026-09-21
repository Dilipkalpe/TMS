import { useCallback, useEffect, useMemo, useState } from 'react'
import { fieldConfigurationsApi } from '../services/api'
import { sortByDisplayOrder, toFieldConfigMap } from '../utils/fieldConfig'

/**
 * Load field configuration once per module (Booking | LR).
 * Returns map, ordered items, loading flag, and reload.
 */
export function useFieldConfig(module) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!module) return
    setLoading(true)
    setError(null)
    try {
      const res = await fieldConfigurationsApi.list(module)
      setItems(Array.isArray(res?.items) ? res.items : [])
    } catch (e) {
      setError(e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [module])

  useEffect(() => {
    load()
  }, [load])

  const map = useMemo(() => toFieldConfigMap(items), [items])
  const ordered = useMemo(() => sortByDisplayOrder(items.filter((i) => i.isActive !== false)), [items])

  return { items, ordered, map, loading, error, reload: load }
}

export default useFieldConfig
