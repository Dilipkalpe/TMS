import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeyboardNavigationService } from './keyboardNavigationService'

describe('KeyboardNavigationService', () => {
  let service

  beforeEach(() => {
    service = new KeyboardNavigationService()
  })

  it('opens help on F1', () => {
    const onHelpOpen = vi.fn()
    service.setHandlers({ onHelpOpen })
    const e = {
      key: 'F1', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
      preventDefault: vi.fn(), target: document.body,
    }
    expect(service.handleKeyDown(e)).toBe(true)
    expect(onHelpOpen).toHaveBeenCalled()
  })

  it('calls page save on Ctrl+S', () => {
    const onSave = vi.fn()
    service.registerPageActions({ onSave })
    const e = {
      key: 's', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false,
      preventDefault: vi.fn(), target: document.body,
    }
    expect(service.handleKeyDown(e)).toBe(true)
    expect(onSave).toHaveBeenCalled()
  })

  it('navigates on Alt+L', () => {
    const navigate = vi.fn()
    service.setHandlers({ navigate })
    const e = {
      key: 'l', ctrlKey: false, metaKey: false, altKey: true, shiftKey: false,
      preventDefault: vi.fn(), target: document.body,
    }
    expect(service.handleKeyDown(e)).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/lr/entry')
  })

  it('Enter moves to next field in Tally mode', () => {
    service.setTallyMode(true)
    document.body.innerHTML = `
      <div data-kbd-form-root>
        <input id="a" /><input id="b" />
      </div>
    `
    const a = document.getElementById('a')
    const b = document.getElementById('b')
    a.focus()
    const e = {
      key: 'Enter', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
      preventDefault: vi.fn(), target: a,
    }
    expect(service.handleKeyDown(e)).toBe(true)
    expect(document.activeElement).toBe(b)
  })
})
