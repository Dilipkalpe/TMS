import { useEffect, useState } from 'react'
import { usePrint } from '../../context/PrintContext'
import { BRAND } from '../../config/brand'
import { settingsApi } from '../../services/api'
import { resolveUploadedLogoUrl } from '../../utils/printLogo'

/**
 * Logged-in company/client logo for sidebar header chrome.
 * Loads via authenticated /api/settings/logo-file (Bearer) so Vite/dev and
 * API-only proxies work. External http(s) logo URLs are used directly.
 * Falls back to CodeeStack brand mark when missing/broken.
 */
export default function CompanyBrandLogo({ className = '' }) {
  const { company } = usePrint()
  const [src, setSrc] = useState(null)
  const rawLogo = company?.logoUrl?.trim() || ''
  const isExternal = /^https?:\/\//i.test(rawLogo) || rawLogo.startsWith('data:')

  useEffect(() => {
    let objectUrl = null
    let cancelled = false

    async function load() {
      if (!rawLogo) {
        if (!cancelled) setSrc(null)
        return
      }
      if (isExternal) {
        if (!cancelled) setSrc(resolveUploadedLogoUrl(rawLogo))
        return
      }
      try {
        const url = await settingsApi.fetchLogoObjectUrl()
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setSrc(url)
      } catch {
        if (!cancelled) setSrc(null)
      }
    }

    load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [rawLogo, isExternal, company?.updatedAt])

  const showCompany = Boolean(src)
  const imgSrc = showCompany ? src : BRAND.logoSrc
  const alt = showCompany
    ? (company?.companyName ? `${company.companyName} logo` : 'Company logo')
    : BRAND.companyName

  return (
    <div
      className={`app-sidebar-brand-logo ${className}`}
      title={company?.companyName || BRAND.productName}
    >
      <img
        key={imgSrc || 'fallback'}
        src={imgSrc}
        alt={alt}
        className="app-sidebar-brand-logo__img"
        decoding="async"
        draggable={false}
        onError={() => {
          if (showCompany) setSrc(null)
        }}
      />
    </div>
  )
}
