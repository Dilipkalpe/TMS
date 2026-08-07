/**
 * Excel-like grid keyboard engine for editable tables.
 */

/**
 * @param {object} options
 * @param {() => unknown[]} options.getRows
 * @param {(rows: unknown[]) => void} options.setRows
 * @param {() => Record<string, unknown>} options.createEmptyRow
 * @param {string[]} options.fieldKeys - ordered editable field keys per row
 */
export function createGridKeyboardEngine({ getRows, setRows, createEmptyRow, fieldKeys }) {
  let undoStack = []
  let redoStack = []
  let activeCell = { row: 0, col: 0 }

  const colCount = fieldKeys.length

  const snapshot = () => JSON.parse(JSON.stringify(getRows()))

  const pushUndo = () => {
    undoStack.push(snapshot())
    if (undoStack.length > 50) undoStack.shift()
    redoStack = []
  }

  const undo = () => {
    if (!undoStack.length) return false
    redoStack.push(snapshot())
    const prev = undoStack.pop()
    if (prev) setRows(prev)
    return true
  }

  const redo = () => {
    if (!redoStack.length) return false
    undoStack.push(snapshot())
    const next = redoStack.pop()
    if (next) setRows(next)
    return true
  }

  const insertRow = () => {
    pushUndo()
    const rows = [...getRows()]
    rows.splice(activeCell.row + 1, 0, createEmptyRow())
    setRows(rows)
    activeCell = { row: activeCell.row + 1, col: 0 }
    return true
  }

  const deleteRow = () => {
    const rows = getRows()
    if (rows.length <= 1) return false
    pushUndo()
    const next = rows.filter((_, i) => i !== activeCell.row)
    setRows(next)
    activeCell = { row: Math.min(activeCell.row, next.length - 1), col: activeCell.col }
    return true
  }

  const duplicateRow = () => {
    const rows = getRows()
    const src = rows[activeCell.row]
    if (!src) return false
    pushUndo()
    const copy = JSON.parse(JSON.stringify(src))
    const next = [...rows]
    next.splice(activeCell.row + 1, 0, copy)
    setRows(next)
    activeCell = { row: activeCell.row + 1, col: activeCell.col }
    return true
  }

  const moveCell = (dr, dc) => {
    const rows = getRows()
    activeCell = {
      row: Math.min(Math.max(0, rows.length - 1), Math.max(0, activeCell.row + dr)),
      col: Math.min(colCount - 1, Math.max(0, activeCell.col + dc)),
    }
    return activeCell
  }

  const focusActiveCell = (container) => {
    const cell = container.querySelector(
      `[data-grid-row="${activeCell.row}"][data-grid-col="${activeCell.col}"] input,` +
      `[data-grid-row="${activeCell.row}"][data-grid-col="${activeCell.col}"] select`,
    )
    if (cell instanceof HTMLElement) {
      cell.focus()
      if (cell instanceof HTMLInputElement) cell.select?.()
    }
  }

  const handleKeyDown = (e, container) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault(); return undo()
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault(); return redo()
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault(); return duplicateRow()
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault(); return handleCopy()
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault(); return pasteFromClipboard()
    }
    if (e.key === 'F7') { e.preventDefault(); insertRow(); focusActiveCell(container); return true }
    if (e.key === 'F6') { e.preventDefault(); deleteRow(); focusActiveCell(container); return true }
    if (e.key === 'Tab') {
      e.preventDefault()
      moveCell(0, e.shiftKey ? -1 : 1)
      focusActiveCell(container)
      return true
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      moveCell(e.shiftKey ? -1 : 1, 0)
      focusActiveCell(container)
      return true
    }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveCell(-1, 0); focusActiveCell(container); return true }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveCell(1, 0); focusActiveCell(container); return true }
    if (e.key === 'ArrowLeft') { e.preventDefault(); moveCell(0, -1); focusActiveCell(container); return true }
    if (e.key === 'ArrowRight') { e.preventDefault(); moveCell(0, 1); focusActiveCell(container); return true }
    return false
  }

  const handleCopy = async () => {
    const row = getRows()[activeCell.row]
    if (!row) return false
    const text = fieldKeys.map((k) => row[k] ?? '').join('\t')
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch { return false }
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) return false
      pushUndo()
      const lines = text.split(/\r?\n/).filter(Boolean)
      const rows = [...getRows()]
      lines.forEach((line, li) => {
        const cells = line.split('\t')
        const ri = activeCell.row + li
        while (rows.length <= ri) rows.push(createEmptyRow())
        const row = { ...rows[ri] }
        cells.forEach((val, ci) => {
          const key = fieldKeys[activeCell.col + ci]
          if (key) row[key] = val
        })
        rows[ri] = row
      })
      setRows(rows)
      return true
    } catch { return false }
  }

  return {
    getActiveCell: () => activeCell,
    setActiveCell: (pos) => { activeCell = pos },
    handleKeyDown,
    focusActiveCell,
    insertRow,
    deleteRow,
    duplicateRow,
    undo,
    redo,
    pushUndo,
  }
}
