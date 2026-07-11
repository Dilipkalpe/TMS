import { useCallback, useEffect, useState } from 'react'

const DEFAULT_PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300

function normalizePagedResponse(result) {
  if (Array.isArray(result)) {
    return {
      items: result,
      total: result.length,
      hasMore: false,
      totalIsApproximate: false,
    }
  }
  return {
    items: result.items ?? [],
    total: result.total ?? 0,
    hasMore: result.hasMore ?? false,
    totalIsApproximate: result.totalIsApproximate ?? false,
  }
}

/** Fetch paginated API lists — returns items + total for server-side table paging */
export function usePagedApiResource(fetchPage, deps = []) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalIsApproximate, setTotalIsApproximate] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('(All)')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchPage({ page, pageSize, search, filter })
      const normalized = normalizePagedResponse(result)
      setItems(normalized.items)
      setHasMore(normalized.hasMore)
      setTotalIsApproximate(normalized.totalIsApproximate)
      if (page === 1 || !normalized.totalIsApproximate) {
        setTotal(normalized.total)
      } else if (normalized.hasMore) {
        setTotal((prev) => Math.max(prev, page * pageSize + 1))
      }
    } catch (err) {
      setError(err.message || 'Failed to load data')
      setItems([])
      setTotal(0)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, filter, ...deps])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setSearchAndReset = useCallback((v) => {
    setPage(1)
    setSearchInput(v)
  }, [])

  const setFilterAndReset = useCallback((v) => {
    setPage(1)
    setFilter(v)
  }, [])

  return {
    items,
    total,
    hasMore,
    totalIsApproximate,
    page,
    pageSize,
    search: searchInput,
    filter,
    loading,
    error,
    setPage,
    setPageSize,
    setSearch: setSearchAndReset,
    setFilter: setFilterAndReset,
    refresh,
  }
}

export function buildListParams({
  page,
  pageSize,
  search,
  filter,
  filterKey = 'status',
  categoryKey = 'category',
} = {}) {
  const params = { page, pageSize, includeTotal: page === 1 }
  if (search?.trim()) params.search = search.trim()
  if (filter && filter !== '(All)') {
    if (filterKey === 'category') params.category = filter
    else params[filterKey] = filter
  }
  return params
}
