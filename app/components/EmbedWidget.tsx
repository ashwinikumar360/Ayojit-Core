'use client'

/**
 * EmbedWidget — Wrapper for embeddable widget mode.
 *
 * When loaded via iframe with ?embed=true, strips the navigation chrome
 * and renders only the core app content. Used by third-party integrations
 * to embed Ayojit tools on their own websites.
 *
 * Usage: <EmbedWidget appId="pinai">{children}</EmbedWidget>
 */

import { useSearchParams } from 'next/navigation'

interface EmbedWidgetProps {
  appId: string
  children: React.ReactNode
}

export default function EmbedWidget({ appId, children }: EmbedWidgetProps) {
  const searchParams = useSearchParams()
  const isEmbed = searchParams.get('embed') === 'true'

  if (isEmbed) {
    return (
      <div className="min-h-screen bg-white p-4" data-embed-app={appId}>
        {/* Minimal branding strip */}
        <div className="border-2 border-black bg-zinc-100 px-3 py-1 mb-4 flex justify-between items-center">
          <span className="font-black text-[10px] uppercase tracking-wider text-zinc-500">
            Powered by Ayojit Intelligence
          </span>
          <a
            href={`https://ayojit-intelligence.vercel.app/apps/${appId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[10px] uppercase text-black underline"
          >
            Open Full App ↗
          </a>
        </div>

        {/* Core app content without navigation */}
        {children}
      </div>
    )
  }

  // Normal mode — render with full navigation
  return <>{children}</>
}

/**
 * Embed code generator — returns the iframe snippet for embedding.
 */
export function getEmbedCode(appId: string, width = '100%', height = '600px'): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ayojit-intelligence.vercel.app'
  return `<iframe
  src="${baseUrl}/apps/${appId}?embed=true"
  width="${width}"
  height="${height}"
  frameborder="0"
  allow="microphone"
  style="border: 4px solid #000; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);"
  title="Ayojit ${appId}"
></iframe>`
}
