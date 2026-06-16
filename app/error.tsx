'use client'

/**
 * Global error boundary — Neo-Brutalism styled error page.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="border-4 border-black bg-amber-300 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-6xl block mb-4">⚠️</span>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Something Went Wrong</h1>
          <p className="font-bold text-sm text-zinc-700 mb-6">
            An unexpected error occurred. This has been logged.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-zinc-500 mb-4">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 border-4 border-black bg-black text-yellow-300 py-3 font-black uppercase
                         shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px]
                         hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              Try Again
            </button>
            <a
              href="/dashboard"
              className="flex-1 border-4 border-black bg-white py-3 font-black uppercase text-center
                         shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px]
                         hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
