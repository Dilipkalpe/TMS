import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { keyboardNavigationService } from '../keyboard/keyboardNavigationService'
import { focusFirstEditable } from '../keyboard/keyUtils'
import KeyboardHelpModal from '../components/keyboard/KeyboardHelpModal'

const STORAGE_KEY = 'tms-keyboard-mode'
const TALLY_KEY = 'tms-tally-mode'

const KeyboardShortcutContext = createContext(null)

export function KeyboardShortcutProvider({ children }) {
  const navigate = useNavigate()
  const [mode, setMode] = useLocalStorage(STORAGE_KEY, 'standard')
  const [tallyModeFlag, setTallyModeFlag] = useLocalStorage(TALLY_KEY, false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [keyboardEnabled, setKeyboardEnabled] = useState(true)
  const pageActionsRef = useRef(null)
  const gridActionsRef = useRef(null)

  const tallyMode = mode === 'tally' || tallyModeFlag

  useEffect(() => {
    keyboardNavigationService.setTallyMode(tallyMode)
    keyboardNavigationService.setEnabled(keyboardEnabled)
  }, [tallyMode, keyboardEnabled])

  useEffect(() => {
    keyboardNavigationService.setHandlers({
      navigate: (path) => navigate(path),
      onHelpOpen: () => setHelpOpen(true),
      onSearchOpen: () => {
        const el = document.querySelector('[data-global-search] input, [data-global-search]')
        if (el instanceof HTMLElement) el.focus()
      },
      onTabSwitch: (index) => {
        const tabs = document.querySelectorAll('[data-kbd-tab-index]')
        if (tabs[index] instanceof HTMLElement) tabs[index].click()
        else document.querySelectorAll('[role="tab"]')[index]?.click()
      },
    })
  }, [navigate])

  useEffect(() => {
    const onKeyDown = (e) => keyboardNavigationService.handleKeyDown(e)
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const registerPageActions = useCallback((actions) => {
    pageActionsRef.current = actions
    keyboardNavigationService.registerPageActions(actions)
    return () => {
      if (pageActionsRef.current === actions) {
        pageActionsRef.current = null
        keyboardNavigationService.unregisterPageActions()
      }
    }
  }, [])

  const registerGridActions = useCallback((actions) => {
    gridActionsRef.current = actions
    keyboardNavigationService.registerGridActions(actions)
    return () => {
      if (gridActionsRef.current === actions) {
        gridActionsRef.current = null
        keyboardNavigationService.unregisterGridActions()
      }
    }
  }, [])

  const registerLookupTrigger = useCallback((fn) => {
    keyboardNavigationService.registerLookupTrigger(fn)
    return () => keyboardNavigationService.unregisterLookupTrigger()
  }, [])

  const setKeyboardMode = useCallback((next) => {
    setMode(next)
    setTallyModeFlag(next === 'tally')
  }, [setMode, setTallyModeFlag])

  const autoFocusForm = useCallback((root) => {
    if (tallyMode) setTimeout(() => focusFirstEditable(root ?? document), 50)
  }, [tallyMode])

  const value = useMemo(() => ({
    mode,
    tallyMode,
    keyboardEnabled,
    setKeyboardMode,
    setTallyMode: setTallyModeFlag,
    setKeyboardEnabled,
    registerPageActions,
    registerGridActions,
    registerLookupTrigger,
    autoFocusForm,
    openHelp: () => setHelpOpen(true),
  }), [
    mode, tallyMode, keyboardEnabled, setKeyboardMode, setTallyModeFlag,
    registerPageActions, registerGridActions, registerLookupTrigger, autoFocusForm,
  ])

  return (
    <KeyboardShortcutContext.Provider value={value}>
      {children}
      <KeyboardHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} tallyMode={tallyMode} />
    </KeyboardShortcutContext.Provider>
  )
}

export function useKeyboardShortcuts() {
  const ctx = useContext(KeyboardShortcutContext)
  if (!ctx) throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutProvider')
  return ctx
}

export function useKeyboardShortcutsOptional() {
  return useContext(KeyboardShortcutContext)
}
