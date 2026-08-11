import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useSearchableDropdownPosition } from '../../hooks/useSearchableDropdownPosition'

/**
 * Portaled ERP-style lookup dropdown panel (fixed position, scrollable list, count header).
 */
export default function SearchableDropdownPanel({
  open,
  anchorRef,
  onClose,
  countText,
  activeIndex,
  listRef,
  children,
  showFooterHint = true,
}) {
  const panelRef = useRef(null)
  const position = useSearchableDropdownPosition({ open, anchorRef })
  const internalListRef = useRef(null)
  const scrollRef = listRef ?? internalListRef

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (anchorRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      onClose?.()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, anchorRef, onClose])

  // Close without committing when focus leaves both the field and the portaled panel
  // (e.g. Tab away). Leaving the popup registered would let a later Enter confirm
  // the previously highlighted option.
  useEffect(() => {
    if (!open) return undefined
    const onFocusIn = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement
        if (anchorRef.current?.contains(active)) return
        if (panelRef.current?.contains(active)) return
        onClose?.()
      })
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [open, anchorRef, onClose])

  useEffect(() => {
    if (!open || !scrollRef.current) return
    const active = scrollRef.current.querySelector('[data-lookup-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex, scrollRef])

  if (!open) return null

  return createPortal(
    <div
      ref={panelRef}
      className="lookup-dropdown-panel"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
      }}
      data-placement={position.placement}
      role="presentation"
    >
      <div className="lookup-dropdown-header">
        <span className="lookup-dropdown-header-text">{countText}</span>
        <button
          type="button"
          className="lookup-dropdown-close"
          onClick={() => onClose?.()}
          aria-label="Close dropdown"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul ref={scrollRef} className="lookup-dropdown-list" role="listbox">
        {children}
      </ul>
      {showFooterHint ? (
        <div className="lookup-dropdown-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
