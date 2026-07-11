import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { getToken, settingsApi } from '../services/api'
import { useAuth } from './AuthContext'
import { DEFAULT_COMPANY } from '../utils/printUtils'
import { getStoredPrintLogoUrl } from '../utils/printLogo'

const PrintContext = createContext(null)

function waitForPrintImages(root) {
  const imgs = root.querySelectorAll('img')
  if (!imgs.length) return Promise.resolve()
  return Promise.all(
    Array.from(imgs).map(
      (img) => img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve
            img.onerror = resolve
          }),
    ),
  )
}

function schedulePrint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export function PrintProvider({ children }) {
  const { isAuthenticated, booting } = useAuth()
  const [company, setCompany] = useState(() => ({
    ...DEFAULT_COMPANY,
    logoUrl: getStoredPrintLogoUrl(),
  }))
  const [printNode, setPrintNode] = useState(null)
  const printingRef = useRef(false)

  const loadCompany = useCallback(() => {
    settingsApi.get()
      .then((s) => setCompany({
        ...DEFAULT_COMPANY,
        ...s,
        logoUrl: s.logoUrl || getStoredPrintLogoUrl() || undefined,
      }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (booting || !isAuthenticated || !getToken()) return
    loadCompany()
  }, [booting, isAuthenticated, loadCompany])

  const print = useCallback((node) => {
    flushSync(() => {
      setPrintNode(node)
      printingRef.current = true
    })

    const root = getPrintRoot()
    schedulePrint()
      .then(() => waitForPrintImages(root))
      .then(() => schedulePrint())
      .then(() => {
        window.document.body.classList.add('printing')
        window.print()
      })
  }, [])

  useEffect(() => {
    const onAfterPrint = () => {
      window.document.body.classList.remove('printing')
      if (printingRef.current) {
        printingRef.current = false
        setPrintNode(null)
      }
    }
    window.addEventListener('afterprint', onAfterPrint)
    return () => window.removeEventListener('afterprint', onAfterPrint)
  }, [])

  const refreshCompany = useCallback(() => {
    loadCompany()
  }, [loadCompany])

  return (
    <PrintContext.Provider value={{ company, print, setCompany, refreshCompany }}>
      {children}
      {printNode && createPortal(printNode, getPrintRoot())}
    </PrintContext.Provider>
  )
}

function getPrintRoot() {
  let root = window.document.getElementById('print-root')
  if (!root) {
    root = window.document.createElement('div')
    root.id = 'print-root'
    window.document.body.appendChild(root)
  }
  return root
}

export function usePrint() {
  const ctx = useContext(PrintContext)
  if (!ctx) throw new Error('usePrint must be used within PrintProvider')
  return ctx
}
