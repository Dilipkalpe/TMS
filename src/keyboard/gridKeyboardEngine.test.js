import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createGridKeyboardEngine } from './gridKeyboardEngine'

function buildContainer(html) {
  document.body.innerHTML = html
  return document.getElementById('grid')
}

function key(target, key, opts = {}) {
  const e = {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target,
    ...opts,
  }
  return e
}

describe('gridKeyboardEngine', () => {
  let setRows
  let rows

  beforeEach(() => {
    rows = [
      { description: 'A', qty: '1' },
      { description: 'B', qty: '2' },
      { description: 'C', qty: '3' },
    ]
    setRows = vi.fn((next) => {
      rows = typeof next === 'function' ? next(rows) : next
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('moves down on ArrowDown within same column', () => {
    const container = buildContainer(`
      <div id="grid" data-kbd-grid="true">
        <div data-grid-row="0" data-grid-col="1"><input id="r0c1" /></div>
        <div data-grid-row="1" data-grid-col="1"><input id="r1c1" /></div>
        <div data-grid-row="2" data-grid-col="1"><input id="r2c1" /></div>
      </div>
    `)
    const engine = createGridKeyboardEngine({
      getRows: () => rows,
      setRows,
      createEmptyRow: () => ({}),
      fieldKeys: ['description', 'qty'],
    })
    const r0 = document.getElementById('r0c1')
    r0.focus()
    engine.handleKeyDown(key(r0, 'ArrowDown'), container)
    expect(document.activeElement).toBe(document.getElementById('r1c1'))
  })

  it('exits forward on Enter at last cell of last row', () => {
    document.body.innerHTML = `
      <div data-kbd-form-root>
        <div id="grid" data-kbd-grid="true">
          <div data-grid-row="0" data-grid-col="0"><input id="only" /></div>
        </div>
        <input id="after" />
      </div>
    `
    const container = document.getElementById('grid')
    rows = [{}]
    const engine = createGridKeyboardEngine({
      getRows: () => rows,
      setRows,
      createEmptyRow: () => ({}),
      fieldKeys: ['description'],
    })
    const only = document.getElementById('only')
    only.focus()
    engine.handleKeyDown(key(only, 'Enter'), container)
    expect(document.activeElement).toBe(document.getElementById('after'))
  })

  it('advances to next column on Enter within a row', () => {
    const container = buildContainer(`
      <div id="grid" data-kbd-grid="true">
        <div data-grid-row="0" data-grid-col="0"><input id="c0" /></div>
        <div data-grid-row="0" data-grid-col="1"><input id="c1" /></div>
      </div>
    `)
    rows = [{}]
    const engine = createGridKeyboardEngine({
      getRows: () => rows,
      setRows,
      createEmptyRow: () => ({}),
      fieldKeys: ['description', 'qty'],
    })
    document.getElementById('c0').focus()
    engine.handleKeyDown(key(document.getElementById('c0'), 'Enter'), container)
    expect(document.activeElement).toBe(document.getElementById('c1'))
  })

  it('exits backward on Shift+Tab at first cell to preview control', () => {
    document.body.innerHTML = `
      <div data-kbd-form-root>
        <button id="preview" data-kbd-grid-before-focus="true">Preview</button>
        <div id="grid" data-kbd-grid="true">
          <div data-grid-row="0" data-grid-col="0"><input id="first" /></div>
        </div>
      </div>
    `
    const container = document.getElementById('grid')
    rows = [{}]
    const engine = createGridKeyboardEngine({
      getRows: () => rows,
      setRows,
      createEmptyRow: () => ({}),
      fieldKeys: ['description'],
    })
    const first = document.getElementById('first')
    first.focus()
    engine.handleKeyDown(key(first, 'Tab', { shiftKey: true }), container)
    expect(document.activeElement).toBe(document.getElementById('preview'))
  })
})
