import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState, useRef } from 'react'
import { useSearchableDropdownKeyboard } from './useSearchableDropdownKeyboard'
import { getTopPopup, popPopup } from '../keyboard/popupKeyboardManager'

function useHarness({ options = ['A', 'B', 'C'], onPick, onEnterNoSelection } = {}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  if (!inputRef.current) {
    inputRef.current = document.createElement('input')
    inputRef.current.setAttribute('role', 'combobox')
    document.body.appendChild(inputRef.current)
  }

  const api = useSearchableDropdownKeyboard({
    popupId: 'test-dd',
    open,
    setOpen,
    options,
    activeIndex,
    setActiveIndex,
    inputRef,
    onPick: onPick ?? vi.fn(),
    onEnterNoSelection: onEnterNoSelection ?? vi.fn(),
  })

  return {
    open,
    activeIndex,
    setActiveIndex,
    inputRef,
    onPick: onPick ?? api.onPick,
    ...api,
    pickSpy: onPick,
    noSelSpy: onEnterNoSelection,
  }
}

describe('useSearchableDropdownKeyboard', () => {
  afterEach(() => {
    popPopup('test-dd')
    document.body.innerHTML = ''
  })

  it('does not commit an option when the list is opened', async () => {
    const onPick = vi.fn()
    const { result } = renderHook(() => useHarness({ onPick }))

    await act(async () => {
      await result.current.openList()
    })

    expect(result.current.open).toBe(true)
    expect(result.current.activeIndex).toBe(-1)
    expect(onPick).not.toHaveBeenCalled()
  })

  it('highlights with arrows but does not commit until confirm', async () => {
    const onPick = vi.fn()
    const { result } = renderHook(() => useHarness({ onPick }))

    await act(async () => {
      await result.current.openList()
    })

    expect(getTopPopup()).toBeTruthy()

    act(() => {
      getTopPopup().onArrow('down')
    })
    expect(result.current.activeIndex).toBe(0)
    expect(onPick).not.toHaveBeenCalled()

    act(() => {
      // Re-read top popup — confirm callback is re-bound after activeIndex changes
      getTopPopup().onConfirm()
    })
    expect(onPick).toHaveBeenCalledWith('A')
  })

  it('confirm with no highlight closes without picking', async () => {
    const onPick = vi.fn()
    const onEnterNoSelection = vi.fn()
    const { result } = renderHook(() => useHarness({ onPick, onEnterNoSelection }))

    await act(async () => {
      await result.current.openList()
    })

    act(() => {
      getTopPopup()?.onConfirm()
    })

    expect(onPick).not.toHaveBeenCalled()
    expect(onEnterNoSelection).toHaveBeenCalled()
  })

  it('suppresses confirm in the same turn as openList', async () => {
    const onPick = vi.fn()
    const { result } = renderHook(() => useHarness({ onPick }))

    await act(async () => {
      const openPromise = result.current.openList()
      getTopPopup()?.onConfirm?.()
      await openPromise
      // Still in the open turn — microtask clear may not have run before this sync confirm
      getTopPopup()?.onConfirm?.()
    })

    // After open settles, a confirm without highlight must not pick
    expect(onPick).not.toHaveBeenCalled()
  })
})
