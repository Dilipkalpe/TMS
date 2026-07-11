/** Default letterhead logo path (static asset under app base path) */
import { API_BASE_URL, APP_BASE_PATH } from '../config/api'

export function getDefaultPrintLogoUrl() {
  const base = APP_BASE_PATH || ''
  return `${base}/print-logo.svg`
}

export function getStoredPrintLogoUrl() {
  try {
    return localStorage.getItem('tms-print-logo-url') || ''
  } catch {
    return ''
  }
}

/** Resolve uploaded logo from API (/uploads/...) or external URL */
export function resolveCompanyLogoUrl(logoUrl) {
  const custom = logoUrl?.trim() || getStoredPrintLogoUrl()
  if (!custom) return getDefaultPrintLogoUrl()
  if (custom.startsWith('http://') || custom.startsWith('https://') || custom.startsWith('data:'))
    return custom
  const apiRoot = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${apiRoot}${custom.startsWith('/') ? custom : `/${custom}`}`
}

export function resolvePrintLogoUrl(company) {
  return resolveCompanyLogoUrl(company?.logoUrl)
}
