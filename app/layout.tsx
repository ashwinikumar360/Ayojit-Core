import type { Metadata } from 'next'
import { Space_Grotesk, Outfit, JetBrains_Mono } from 'next/font/google'
import { I18nProvider } from '@/lib/i18n'
import { ToastProvider } from '@/app/components/Toast'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ayojit Intelligence',
  description: 'Unified AIKosh open-license AI suite for citizens, farmers, and government pilot projects.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check maintenance mode via server-side env if present
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE === 'true'

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased bg-zinc-100 text-black min-h-screen">
        <I18nProvider>
          <ToastProvider>
            {isMaintenance ? (
              // If maintenance mode is on globally, enforce showing it.
              // Note: Usually routing handles this, but layout-level fallback ensures robust protection.
              <div className="min-h-screen bg-zinc-100 font-sans text-black flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                  <div className="border-4 border-black bg-yellow-300 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-6xl block mb-4">🔧</span>
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-2">
                      System Under Maintenance
                    </h1>
                    <p className="font-bold text-sm text-zinc-700 mb-6">
                      Ayojit is performing scheduled upgrades. We will return shortly.
                    </p>
                    <div className="border-3 border-black bg-white p-4">
                      <p className="font-mono text-xs text-zinc-500">
                        Expected duration: ~30 minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              children
            )}
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
