/**
 * Maintenance mode page — Displayed when NEXT_PUBLIC_MAINTENANCE=true.
 */

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="border-4 border-black bg-yellow-300 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-6xl block mb-4">🔧</span>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">
            We&apos;ll Be Right Back
          </h1>
          <p className="font-bold text-sm text-zinc-700 mb-6">
            We are performing scheduled maintenance. Please check back shortly.
          </p>
          <div className="border-3 border-black bg-white p-4 mb-6">
            <p className="font-mono text-xs text-zinc-500">
              Expected duration: ~30 minutes
            </p>
          </div>
          <p className="font-bold text-xs text-zinc-600">
            For urgent matters, contact{' '}
            <a href="mailto:tarai.ashwinikumar@gmail.com" className="underline text-black">
              tarai.ashwinikumar@gmail.com
            </a>
          </p>
        </div>

        {/* Attribution footer */}
        <div className="mt-6 text-[10px] font-mono text-zinc-400 text-center">
          Ayojit Intelligence — Powered by AIKosh, IndiaAI, MeitY
        </div>
      </div>
    </div>
  )
}
