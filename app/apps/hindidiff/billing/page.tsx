'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const API_BASE = process.env.NEXT_PUBLIC_HINDIDIFF_API_URL || "http://localhost:8000"

export default function HindiDiffBilling() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    })()
  }, [])

  const handleSubscribe = async () => {
    if (!user) {
      setError("Please log in first")
      return
    }

    setLoading(true)
    setError("")

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      // 1. Create subscription via FastAPI backend proxy
      const res = await fetch(`${API_BASE}/billing/create-subscription/hindidiff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error("Failed to create billing session")
      }

      const data = await res.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        throw new Error("Invalid checkout response from server")
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during subscription processing")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans text-black p-6">
        <div className="max-w-md border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <span className="text-5xl">✅</span>
          <h1 className="text-3xl font-black uppercase mt-4">Subscription Activated</h1>
          <p className="font-bold text-zinc-700 mt-2">
            Thank you! You now have unlimited access to HindiDiff Pro image generation.
          </p>
          <a href="/apps/hindidiff" className="mt-6 inline-block border-2 border-black bg-yellow-300 px-6 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            Back to Generator
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans text-black p-6">
      <div className="max-w-md border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        
        {/* navigation back link */}
        <div className="mb-4 text-left">
          <a href="/apps/hindidiff" className="text-xs font-black underline uppercase">
            ← Cancel
          </a>
        </div>

        <h1 className="text-3xl font-black uppercase text-center border-b-4 border-black pb-2">Go Pro</h1>
        
        <div className="text-center my-6">
          <span className="text-5xl filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">🎨</span>
          <h2 className="text-2xl font-black uppercase mt-2">HindiDiff Pro</h2>
          <p className="font-bold text-zinc-600 mt-1">Unlimited High-Definition Images</p>
        </div>

        {/* Features card list */}
        <div className="border-2 border-black bg-zinc-50 p-4 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <ul className="text-sm font-bold flex flex-col gap-2">
            <li>✨ Generate up to 4 variations at once</li>
            <li>🚀 Zero queue latency (high priority servers)</li>
            <li>💾 Unlimited history gallery storage</li>
            <li>💳 Flexible ₹99/month plan (cancel anytime)</li>
          </ul>
        </div>

        {error && (
          <div className="border-2 border-black bg-red-400 p-3 mb-4 text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full border-4 border-black bg-orange-300 hover:bg-orange-400 p-3 font-black text-lg uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all">
          {loading ? "Processing..." : "Subscribe for ₹99/month"}
        </button>

        <p className="text-[10px] text-zinc-500 font-mono mt-4 text-center">
          Secured by Dodo Payments. Auto-renews monthly until cancelled. Refunds are subject to terms of service.
        </p>

      </div>
    </div>
  )
}
