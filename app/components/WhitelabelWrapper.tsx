'use client'

import { getWhitelabelConfig } from '@/lib/whitelabel'

/**
 * WhitelabelWrapper — Applies dynamic branding from environment variables.
 * Wraps pages with the configured brand color and name. Falls back to
 * Ayojit Intelligence defaults when no overrides are set.
 */
export default function WhitelabelWrapper({ children }: { children: React.ReactNode }) {
  const config = getWhitelabelConfig()

  return (
    <div
      style={{ '--brand-color': config.brandColor, '--brand-color-light': config.brandColorLight } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

/**
 * BrandLogo — Renders the brand logo or falls back to the brand name text.
 */
export function BrandLogo({ className = '' }: { className?: string }) {
  const config = getWhitelabelConfig()

  if (config.logoUrl) {
    return (
      <img
        src={config.logoUrl}
        alt={config.brandName}
        className={`h-8 ${className}`}
      />
    )
  }

  return (
    <span className={`font-black text-xl uppercase tracking-tight ${className}`}>
      {config.brandName}
    </span>
  )
}

/**
 * BrandFooter — Renders the attribution footer with AIKosh disclaimer.
 */
export function BrandFooter() {
  const config = getWhitelabelConfig()

  return (
    <div className="border-4 border-black bg-white p-5 text-xs font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {config.footerText}
    </div>
  )
}
