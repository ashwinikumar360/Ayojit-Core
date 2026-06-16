/**
 * Custom 404 page — Neo-Brutalism styled "Page Not Found" page.
 */

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="border-4 border-black bg-red-400 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-6xl block mb-4">🔍</span>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">404</h1>
          <p className="text-xl font-black uppercase mb-4">Page Not Found</p>
          <p className="font-bold text-sm text-zinc-800 mb-6">
            The page you are looking for does not exist or has been moved.
          </p>
          <a
            href="/dashboard"
            className="inline-block border-4 border-black bg-black text-yellow-300 px-6 py-3 font-black uppercase
                       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px]
                       hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            Go to Dashboard →
          </a>
        </div>
      </div>
    </div>
  )
}
