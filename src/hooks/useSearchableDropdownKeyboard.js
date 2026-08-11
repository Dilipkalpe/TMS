import { useCallback, useEffect, useRef } from 'react'
import { usePopupKeyboard } from './usePopupKeyboard'
import { focusNextEditable } from '../keyboard/keyUtils'

/**
 * Shared keyboard behaviour for searchable dropdowns:
 * Enter opens list, ↑/↓ highlight (do not commit), Enter selects highlighted option.
 * Opening must not commit the first/default option.
 */
export function useSearchableDropdownKeyboard({
  popupId,
  open,
  setOpen,
  disabled = false,
  loading = false,
  options = [],
  navigableCount,
  activeIndex,
  setActiveIndex,
  inputRef,
  resetIndexOn = [],
  blockOpen = false,
  onOpen,
  onPick,
  onEnterNoSelection,
}) {
  const count = navigableCount ?? options.length
  /** Prevents the same Enter that opens the list from also confirming a highlight. */
  const suppressConfirmRef = useRef(false)

  const pick = useCallback((item, { advanceFocus = false } = {}) => {
    onPick(item)
    if (advanceFocus && inputRef.current) {
      requestAnimationFrame(() => focusNextEditable(inputRef.current))
    }
  }, [inputRef, onPick])

  const openList = useCallback(async () => {
    suppressConfirmRef.current = true
    setOpen(true)
    setActiveIndex(-1)
    await onOpen?.()
    queueMicrotask(() => {
      suppressConfirmRef.current = false
    })
  }, [onOpen, setActiveIndex, setOpen])

  useEffect(() => {
    if (!open) return
    setActiveIndex(-1)
  }, [open, setActiveIndex, ...resetIndexOn])

  const confirmSelection = useCallback(() => {
    if (suppressConfirmRef.current || loading) return
    if (activeIndex >= 0 && activeIndex < options.length) {
      pick(options[activeIndex], { advanceFocus: true })
      return
    }
    // Highlighted non-option row (e.g. "Record not found") or no highlight — do not invent a pick.
    if (activeIndex >= 0 && count > 0) {
      onEnterNoSelection?.()
      return
    }
    onEnterNoSelection?.()
  }, [activeIndex, count, loading, onEnterNoSelection, options, pick])

  usePopupKeyboard({
    id: popupId,
    open: open && !disabled,
    onClose: () => setOpen(false),
    onConfirm: confirmSelection,
    onArrow: (dir) => {
      if (!count) return
      setActiveIndex((i) => {
        if (i < 0) return dir === 'down' ? 0 : count - 1
        return dir === 'down' ? (i + 1) % count : (i - 1 + count) % count
      })
    },
    focusSearch: () => inputRef.current?.focus(),
  })

  useEffect(() => {
    if (disabled) return undefined
    const input = inputRef.current
    if (!input) return undefined

    const onCaptureEnter = (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.target !== input) return
      if (open || blockOpen) return
      e.preventDefault()
      e.stopImmediatePropagation()
      openList()
    }

    document.addEventListener('keydown', onCaptureEnter, true)
    return () => document.removeEventListener('keydown', onCaptureEnter, true)
  }, [disabled, inputRef, open, blockOpen, openList])

  const handleKeyDown = useCallback(async (e) => {
    if (e.defaultPrevented) return

    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (!open) {
        await openList()
        return
      }
      confirmSelection()
      return
    }

    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape')) {
      return
    }
  }, [confirmSelection, open, openList])

  return { handleKeyDown, pick, openList }
}
