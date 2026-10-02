import { BRAND } from '../../config/brand'

/**
 * Official CodeeStack logo — artwork preserved; presentation only adapts to surface.
 *
 * @param {'theme'|'bare'|'hero'} [variant]
 *   theme — light-surface logo on frosted plate (header over busy backgrounds)
 *   bare  — dark-plate logo for sidebar / dark chrome
 *   hero  — light-surface logo only (login card / about — no extra box)
 */
export default function BrandLogo({
  className = '',
  imgClassName = '',
  alt = BRAND.companyName,
  variant = 'theme',
}) {
  const isDarkSurface = variant === 'bare'
  const src = isDarkSurface ? BRAND.logoSrc : BRAND.logoSrcLight

  const img = (
    <img
      src={src}
      alt={alt}
      className={`block h-auto w-auto max-w-full object-contain object-center ${imgClassName}`}
      decoding="async"
      draggable={false}
    />
  )

  if (isDarkSurface || variant === 'hero') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {img}
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-white/90 px-2 py-1.5 shadow-sm ring-1 ring-primary/20 ${className}`}
    >
      {img}
    </div>
  )
}
