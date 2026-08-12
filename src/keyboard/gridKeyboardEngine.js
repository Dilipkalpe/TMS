/**
 * ERP/Tally-style grid keyboard engine.
 * Arrow keys navigate cells; Enter/Tab advance columns with row wrap;
 * boundary Enter exits forward; Shift+Tab from first cell exits to preview control.
 */

import { focusNextEditable, getEditableElements, isFocusableEditable } from './keyUtils'

const GRID_BEFORE_FOCUS = '[data-kbd-grid-before-focus]'

function getGridEditableElements(container) {
  const cells = [...container.querySelectorAll('[data-grid-row][data-grid-col]')]
  const items = []
  for (const cell of cells) {
    const row = Number(cell.dataset.gridRow)
    const col = Number(cell.dataset.gridCol)
    if (Number.isNaN(row) || Number.isNaN(col)) continue
    const input = cell.querySelector('input:not([disabled]):not([readonly]), select:not([disabled])')
    if (input instanceof HTMLElement && isFocusableEditable(input)) {
      items.push({ el: input, row, col })
    }
  }
  items.sort((a, b) => (a.row - b.row) || (a.col - b.col))
  return items
}

function exitGridForward(container, fromEl) {
  const root = container.closest('[data-kbd-form-root]') ?? document
  const gridEls = getGridEditableElements(container).map((i) => i.el)
  const all = getEditableElements(root)
  const anchor = fromEl instanceof HTMLElement ? fromEl : gridEls[gridEls.length - 1]
  const idx = all.indexOf(anchor)
  const next = idx >= 0 ? all[idx + 1] : all.find((el) => !gridEls.includes(el) && el.compareDocumentPosition(gridEls[0]) & Node.DOCUMENT_POSITION_FOLLOWING)
  if (next instanceof HTMLElement) {
    next.focus()
    if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) next.select?.()
    return true
  }
  return focusNextEditable(anchor, false)
}

function exitGridBackward(container) {
  const root = container.closest('[data-kbd-form-root]') ?? document
  const preview = root.querySelector(GRID_BEFORE_FOCUS)
  if (preview instanceof HTMLElement) {
    preview.focus()
    return true
  }
  const gridEls = getGridEditableElements(container).map((i) => i.el)
  const all = getEditableElements(root)
  const firstGrid = gridEls[0]
  if (!firstGrid) return false
  const idx = all.indexOf(firstGrid)
  if (idx > 0) {
    const prev = all[idx - 1]
    prev.focus()
    if (prev instanceof HTMLInputElement || prev instanceof HTMLTextAreaElement) prev.select?.()
    return true
  }
  return focusNextEditable(firstGrid, true)
}

export function createGridKeyboardEngine({
  getRows,
  setRows,
  createEmptyRow,
  fieldKeys,
  onCellFocus,
  onRowChange,
}) {
  const colCount = fieldKeys.length
  let activeCell = { row: 0, col: 0 }
  let clipboard = null

  const syncActiveCellFromTarget = (target) => {
    if (!(target instanceof HTMLElement)) return
    const cell = target.closest('[data-grid-row][data-grid-col]')
    if (!cell || !cell.dataset.gridRow || !cell.dataset.gridCol) return
    activeCell = {
      row: Number(cell.dataset.gridRow),
      col: Number(cell.dataset.gridCol),
    }
  }

  const getRowCount = () => getRows()?.length ?? 0

  const isFirstCell = () => activeCell.row === 0 && activeCell.col === 0

  const isLastCell = () => {
    const rows = getRowCount()
    return rows > 0 && activeCell.row === rows - 1 && activeCell.col === colCount - 1
  }

  const clampCell = () => {
    const rows = getRowCount()
    if (rows === 0) {
      activeCell = { row: 0, col: 0 }
      return
    }
    activeCell.row = Math.max(0, Math.min(activeCell.row, rows - 1))
    activeCell.col = Math.max(0, Math.min(activeCell.col, colCount - 1))
  }

  const focusCell = (container) => {
    clampCell()
    const cell = container.querySelector(
      `[data-grid-row="${activeCell.row}"][data-grid-col="${activeCell.col}"] input, [data-grid-row="${activeCell.row}"][data-grid-col="${activeCell.col}"] select`
    )
    if (cell instanceof HTMLElement) {
      cell.focus()
      if (cell instanceof HTMLInputElement || cell instanceof HTMLTextAreaElement) cell.select?.()
      onCellFocus?.(activeCell.row, activeCell.col)
    }
  }

  const moveCell = (dRow, dCol) => {
    activeCell.row += dRow
    activeCell.col += dCol
    clampCell()
  }

  /** Advance to next/previous editable cell in row-major order; returns boundary action. */
  const advanceCell = (reverse) => {
    if (reverse) {
      if (isFirstCell()) return 'exit-back'
      if (activeCell.col > 0) {
        activeCell.col -= 1
      } else if (activeCell.row > 0) {
        activeCell.row -= 1
        activeCell.col = colCount - 1
      } else {
        return 'exit-back'
      }
      return 'moved'
    }

    if (isLastCell()) return 'exit-forward'
    if (activeCell.col < colCount - 1) {
      activeCell.col += 1
    } else if (activeCell.row < getRowCount() - 1) {
      activeCell.row += 1
      activeCell.col = 0
    } else {
      return 'exit-forward'
    }
    return 'moved'
  }

  const deleteRow = () => {
    const rows = getRows()
    if (rows.length <= 1) return
    const idx = activeCell.row
    setRows(rows.filter((_, i) => i !== idx))
    activeCell.row = Math.max(0, idx - 1)
    clampCell()
    onRowChange?.('delete', idx)
  }

  const insertRow = () => {
    const rows = getRows()
    const idx = activeCell.row + 1
    const next = [...rows]
    next.splice(idx, 0, createEmptyRow())
    setRows(next)
    activeCell.row = idx
    activeCell.col = 0
    onRowChange?.('insert', idx)
  }

  const handleKeyDown = (e, container) => {
    if (!container?.contains(e.target)) return false
    // Popups/modals (Add Item, Add Consignor, etc.) own Enter / arrows — never treat as grid nav.
    if (e.target instanceof HTMLElement && e.target.closest('[data-kbd-popup], [role="dialog"]')) {
      return false
    }

    syncActiveCellFromTarget(e.target)

    const key = e.key
    const mod = e.ctrlKey || e.metaKey

    if (mod && key === 'z' && !e.shiftKey) {
      e.preventDefault()
      return true
    }
    if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
      e.preventDefault()
      return true
    }

    if (mod && key === 'c') {
      const rows = getRows()
      clipboard = rows[activeCell.row] ? { ...rows[activeCell.row] } : null
      e.preventDefault()
      return true
    }
    if (mod && key === 'v' && clipboard) {
      const rows = getRows()
      const next = [...rows]
      next[activeCell.row] = { ...next[activeCell.row], ...clipboard }
      setRows(next)
      e.preventDefault()
      return true
    }
    if (mod && key === 'd') {
      const rows = getRows()
      const next = [...rows]
      next.splice(activeCell.row + 1, 0, { ...rows[activeCell.row] })
      setRows(next)
      e.preventDefault()
      return true
    }

    if (key === 'F6') {
      e.preventDefault()
      deleteRow()
      requestAnimationFrame(() => focusCell(container))
      return true
    }
    if (key === 'F7') {
      e.preventDefault()
      insertRow()
      requestAnimationFrame(() => focusCell(container))
      return true
    }

    if (key === 'ArrowUp') {
      e.preventDefault()
      moveCell(-1, 0)
      focusCell(container)
      return true
    }
    if (key === 'ArrowDown') {
      e.preventDefault()
      moveCell(1, 0)
      focusCell(container)
      return true
    }
    if (key === 'ArrowLeft') {
      e.preventDefault()
      moveCell(0, -1)
      focusCell(container)
      return true
    }
    if (key === 'ArrowRight') {
      e.preventDefault()
      moveCell(0, 1)
      focusCell(container)
      return true
    }

    if (key === 'Tab') {
      e.preventDefault()
      const result = advanceCell(e.shiftKey)
      if (result === 'exit-forward') {
        exitGridForward(container, e.target)
      } else if (result === 'exit-back') {
        exitGridBackward(container)
      } else {
        focusCell(container)
      }
      return true
    }

    if (key === 'Enter' && !mod) {
      e.preventDefault()
      const result = advanceCell(e.shiftKey)
      if (result === 'exit-forward') {
        exitGridForward(container, e.target)
      } else if (result === 'exit-back') {
        exitGridBackward(container)
      } else {
        focusCell(container)
      }
      return true
    }

    return false
  }

  const handleFocusIn = (e) => {
    syncActiveCellFromTarget(e.target)
  }

  return {
    handleKeyDown,
    handleFocusIn,
    syncActiveCellFromTarget,
    focusCell: (container) => focusCell(container),
    getActiveCell: () => ({ ...activeCell }),
    setActiveCell: (row, col) => {
      activeCell = { row, col }
    },
  }
}
