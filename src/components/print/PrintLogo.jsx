import { resolvePrintLogoUrl } from '../../utils/printLogo'

/** Inline truck mark — always prints (no network load) */
function DefaultLogoMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      width="56"
      height="56"
      className="print-logo-svg"
      aria-hidden
    >
      <rect width="56" height="56" rx="10" fill="#0f172a" />
      <path d="M10 36h28l4-8H14l-4 8z" fill="#1e5a8a" />
      <path d="M14 26h26l3-6H17l-3 6z" fill="#2563eb" />
      <rect x="8" y="36" width="32" height="3" rx="1" fill="#f59e0b" />
      <circle cx="18" cy="40" r="4" fill="#334155" stroke="#f8fafc" strokeWidth="1.5" />
      <circle cx="34" cy="40" r="4" fill="#334155" stroke="#f8fafc" strokeWidth="1.5" />
      <path d="M38 30h8l4 6h-12v-6z" fill="#1e5a8a" />
    </svg>
  )
}

export default function PrintLogo({ company, size = 'md' }) {
  const logoUrl = resolvePrintLogoUrl(company)
  const isDefaultSvg = logoUrl.endsWith('/print-logo.svg') || logoUrl.endsWith('print-logo.svg')
  const height = size === 'sm' ? 44 : 56

  return (
    <div className="print-logo-wrap" style={{ minWidth: height, minHeight: height }}>
      {!isDefaultSvg ? (
        <img
          src={logoUrl}
          alt={company?.companyName ? `${company.companyName} logo` : 'Company logo'}
          className="print-logo-img"
          style={{ maxHeight: height, maxWidth: 160 }}
          crossOrigin="anonymous"
        />
      ) : (
        <DefaultLogoMark />
      )}
    </div>
  )
}
