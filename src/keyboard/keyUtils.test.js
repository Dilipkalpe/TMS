import { describe, it, expect } from 'vitest'
import { normalizeKeyEvent, shouldBlockGlobalShortcut } from './keyUtils'

describe('normalizeKeyEvent', () => {
  it('normalizes Ctrl+S', () => {
    const e = { ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, key: 's' }
    expect(normalizeKeyEvent(e)).toBe('ctrl+s')
  })

  it('normalizes Alt+L', () => {
    const e = { ctrlKey: false, metaKey: false, altKey: true, shiftKey: false, key: 'l' }
    expect(normalizeKeyEvent(e)).toBe('alt+l')
  })

  it('normalizes F3', () => {
    const e = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: 'F3' }
    expect(normalizeKeyEvent(e)).toBe('f3')
  })
})

describe('shouldBlockGlobalShortcut', () => {
  it('blocks F6 when typing in input', () => {
    const input = document.createElement('input')
    const e = { target: input }
    expect(shouldBlockGlobalShortcut(e, 'f6')).toBe(true)
  })

  it('allows Ctrl+S in input', () => {
    const input = document.createElement('input')
    const e = { target: input }
    expect(shouldBlockGlobalShortcut(e, 'ctrl+s')).toBe(false)
  })

  it('allows Alt+L in input', () => {
    const input = document.createElement('input')
    const e = { target: input }
    expect(shouldBlockGlobalShortcut(e, 'alt+l')).toBe(false)
  })
})
