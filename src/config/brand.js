/** Centralized CodeeStack product branding — single source of truth for UI copy. */

export const BRAND = {
  companyName: 'CodeeStack',
  productName: 'CodeeStack TMS',
  shortName: 'CodeeStack',
  website: 'www.codeestack.com',
  websiteUrl: 'https://www.codeestack.com',
  tagline: 'Smart Software. Smarter Operations.',
  /** Official mark (dark plate) — use on dark chrome / sidebar */
  logoSrc: '/codeestack-logo.png',
  /** Same artwork with black plate removed — use on light surfaces */
  logoSrcLight: '/codeestack-logo-light.png',
  copyrightYear: 2026,
}

export function brandCopyright() {
  return `© ${BRAND.copyrightYear} ${BRAND.companyName}. All Rights Reserved.`
}

export function brandPoweredBy() {
  return `Powered by ${BRAND.companyName} | ${BRAND.website}`
}

export function brandDocumentTitle(pageName) {
  if (!pageName) return BRAND.productName
  return `${BRAND.productName} - ${pageName}`
}

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'
