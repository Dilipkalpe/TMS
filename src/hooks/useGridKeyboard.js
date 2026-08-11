import { useEffect, useRef, useCallback } from 'react'
import { createGridKeyboardEngine } from '../keyboard/gridKeyboardEngine'
import { useKeyboardShortcutsOptional } from '../context/KeyboardShortcutContext'

function buildEngine(rowsRef, configRef) {
  return createGridKeyboardEngine({
    getRows: () => rowsRef.current,
    setRows: (...args) => configRef.current.setRows(...args),
    createEmptyRow: () => configRef.current.createEmptyRow(),
    fieldKeys: configRef.current.fieldKeys,
    onCellFocus: (...args) => configRef.current.onCellFocus?.(...args),
    onRowChange: (...args) => configRef.current.onRowChange?.(...args),
  })
}

/**
 * Registers ERP-style grid keyboard navigation via the global keyboard service only
 * (no duplicate container keydown handler).
 */
export function useGridKeyboard({
  rows,
  setRows,
  createEmptyRow,
  fieldKeys,
  enabled = true,
  onCellFocus,
  onRowChange,
}) {
  const kbd = useKeyboardShortcutsOptional()
  const containerRef = useRef(null)
  const rowsRef = useRef(rows)
  const configRef = useRef({ setRows, createEmptyRow, fieldKeys, onCellFocus, onRowChange })
  rowsRef.current = rows
  configRef.current = { setRows, createEmptyRow, fieldKeys, onCellFocus, onRowChange }

  const engineRef = useRef(null)
  if (!engineRef.current && fieldKeys?.length) {
    engineRef.current = buildEngine(rowsRef, configRef)
  }

  useEffect(() => {
    if (!fieldKeys?.length) return
    engineRef.current = buildEngine(rowsRef, configRef)
  }, [fieldKeys])

  useEffect(() => {
    if (!kbd || !enabled) return undefined
    return kbd.registerGridActions({
      onKeyDown: (e) => {
        const container = containerRef.current
        const engine = engineRef.current
        if (!container?.contains(document.activeElement) || !engine) return false
        const handled = engine.handleKeyDown(e, container)
        if (handled) {
          e.preventDefault()
          e.stopPropagation()
        }
        return handled
      },
    })
  }, [kbd, enabled])

  useEffect(() => {
    const container = containerRef.current
    const engine = engineRef.current
    if (!enabled || !container || !engine) return undefined

    const onFocusIn = (e) => engine.handleFocusIn(e)
    container.addEventListener('focusin', onFocusIn)
    return () => container.removeEventListener('focusin', onFocusIn)
  }, [enabled])

  const focusCell = useCallback((row, col) => {
    engineRef.current?.setActiveCell(row, col)
    if (containerRef.current) engineRef.current?.focusCell(containerRef.current)
  }, [])

  return { containerRef, focusCell }
}
