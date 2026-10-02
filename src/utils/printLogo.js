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

/**
 * Resolve an uploaded/external logo path for <img src>.
 * Returns null when empty (caller should show CodeeStack / default fallback).
 *
 * - Absolute http(s)/data URLs are returned as-is
 * - Absolute API host (VITE_API_URL=http://host:5000/api) → http://host:5000/uploads/...
 * - Relative /api (Vite dev) → /uploads/... (proxied by Vite to the API)
 */
export function resolveUploadedLogoUrl(logoUrl, { cacheBust } = {}) {
  const custom = logoUrl?.trim()
  if (!custom) return null

  let resolved
  if (custom.startsWith('http://') || custom.startsWith('https://') || custom.startsWith('data:')) {
    resolved = custom
  } else if (/^https?:\/\//i.test(API_BASE_URL)) {
    const apiRoot = API_BASE_URL.replace(/\/api\/?$/, '')
    resolved = `${apiRoot}${custom.startsWith('/') ? custom : `/${custom}`}`
  } else {
    // Same-origin relative path (Vite proxies /uploads → API in dev)
    resolved = custom.startsWith('/') ? custom : `/${custom}`
  }

  if (cacheBust && !resolved.startsWith('data:')) {
    const sep = resolved.includes('?') ? '&' : '?'
    return `${resolved}${sep}v=${encodeURIComponent(String(cacheBust))}`
  }
  return resolved
}

/** Resolve uploaded logo from API (/uploads/...) or external URL; falls back to default print mark */
export function resolveCompanyLogoUrl(logoUrl) {
  const resolved = resolveUploadedLogoUrl(logoUrl?.trim() || getStoredPrintLogoUrl())
  return resolved || getDefaultPrintLogoUrl()
}

export function resolvePrintLogoUrl(company) {
  return resolveCompanyLogoUrl(company?.logoUrl)
}
