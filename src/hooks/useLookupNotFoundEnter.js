import { useCallback, useEffect } from 'react'
import { focusNextEditable } from '../keyboard/keyUtils'

/**
 * Shared “Record Not Found → Add” + Enter navigation for all searchable master lookups.
 * App-wide: typed name with no match opens Add; otherwise Enter closes and moves to next control.
 */
export function useLookupNotFoundEnter({
  allowCreate = true,
  masterConfig,
  loading = false,
  open,
  query,
  optionsLength,
  setActiveIndex,
  setOpen,
  inputRef,
  openMasterAdd,
}) {
  const showNotFound = Boolean(
    allowCreate && masterConfig && !loading && open && String(query || '').trim() && optionsLength === 0,
  )

  useEffect(() => {
    if (showNotFound) setActiveIndex(0)
  }, [showNotFound, query, loading, optionsLength, setActiveIndex])

  const advanceFocus = useCallback(() => {
    if (!inputRef?.current) return
    requestAnimationFrame(() => focusNextEditable(inputRef.current))
  }, [inputRef])

  const handleEnterNoSelection = useCallback(() => {
    const trimmed = String(query || '').trim()

    if (loading) {
      if (!trimmed) {
        setOpen(false)
        advanceFocus()
      } else if (allowCreate && masterConfig) {
        openMasterAdd?.(trimmed)
      }
      return
    }

    if (allowCreate && masterConfig && trimmed && optionsLength === 0) {
      openMasterAdd?.(trimmed)
      return
    }

    setOpen(false)
    advanceFocus()
  }, [
    loading,
    query,
    allowCreate,
    masterConfig,
    optionsLength,
    openMasterAdd,
    setOpen,
    advanceFocus,
  ])

  const emptyListMessage = String(query || '').trim()
    ? 'No records found'
    : 'Type to search…'

  return {
    showNotFound,
    navigableCount: showNotFound ? 1 : optionsLength,
    handleEnterNoSelection,
    emptyListMessage,
    advanceFocus,
  }
}

/** Enter with no highlight: close list and move to next field (static lists / no create). */
export function useLookupAdvanceOnEnter({ setOpen, inputRef }) {
  return useCallback(() => {
    setOpen(false)
    if (!inputRef?.current) return
    requestAnimationFrame(() => focusNextEditable(inputRef.current))
  }, [setOpen, inputRef])
}
