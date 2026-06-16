'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DocPatramSuccess() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/apps/docpatram')
    }, 5000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans text-black p-6">
      <div className="max-w-md border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
        <span className="text-5xl">✅</span>
        <h1 className="text-3xl font-black uppercase mt-4">Subscription Activated</h1>
        <p className="font-bold text-zinc-700 mt-2">
          Thank you! Your DocPatram Pro subscription is now active. You have unlimited access to document formatting and layout extractions.
        </p>
        <p className="text-xs font-mono text-zinc-500 mt-4">
          Redirecting back in 5 seconds...
        </p>
        <a href="/apps/docpatram" className="mt-6 inline-block border-2 border-black bg-yellow-300 px-6 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
          Go Back Now
        </a>
      </div>
    </div>
  )
}
