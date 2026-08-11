import { useEffect, useState } from 'react'

const PANEL_MAX_HEIGHT = 320
const GAP = 4
const FOOTER_CLEARANCE = 72

/**
 * Fixed positioning for portaled lookup dropdowns — avoids parent overflow clipping
 * and opens upward when space below is limited (e.g. near sticky footer).
 */
export function useSearchableDropdownPosition({ open, anchorRef }) {
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: PANEL_MAX_HEIGHT,
    placement: 'bottom',
  })

  useEffect(() => {
    if (!open) return undefined

    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom - GAP - FOOTER_CLEARANCE
      const spaceAbove = rect.top - GAP
      const openUp = spaceBelow < 200 && spaceAbove > spaceBelow

      const maxHeight = Math.min(
        PANEL_MAX_HEIGHT,
        Math.max(180, openUp ? spaceAbove : spaceBelow),
      )

      const top = openUp
        ? Math.max(GAP, rect.top - GAP - maxHeight)
        : rect.bottom + GAP

      setPosition({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight,
        placement: openUp ? 'top' : 'bottom',
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef])

  return position
}
