import { useEffect, useRef } from 'react'
import { createGridKeyboardEngine } from '../keyboard/gridKeyboardEngine'
import { useKeyboardShortcutsOptional } from '../context/KeyboardShortcutContext'

export function useGridKeyboard({ rows, setRows, createEmptyRow, fieldKeys, enabled = true }) {
  const kbd = useKeyboardShortcutsOptional()
  const containerRef = useRef(null)
  const engineRef = useRef(null)

  useEffect(() => {
    if (!fieldKeys?.length) return
    engineRef.current = createGridKeyboardEngine({
      getRows: () => rows,
      setRows,
      createEmptyRow,
      fieldKeys,
    })
  }, [rows, setRows, createEmptyRow, fieldKeys])

  useEffect(() => {
    if (!kbd || !enabled || !engineRef.current) return undefined
    const engine = engineRef.current
    return kbd.registerGridActions({
      onKeyDown: (e) => {
        if (!containerRef.current?.contains(document.activeElement)) return false
        return engine.handleKeyDown(e, containerRef.current)
      },
      onInsertRow: () => engine.insertRow(),
      onDeleteRow: () => engine.deleteRow(),
      onDuplicateRow: () => engine.duplicateRow(),
    })
  }, [kbd, enabled, rows])

  const onContainerKeyDown = (e) => {
    if (engineRef.current && containerRef.current) {
      engineRef.current.handleKeyDown(e, containerRef.current)
    }
  }

  return { containerRef, onContainerKeyDown, engine: engineRef.current }
}
