'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const API_BASE = process.env.NEXT_PUBLIC_PINAI_API_URL || "http://localhost:8000"

export default function PinAIBilling() {
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

    // Dynamically load Razorpay checkout script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
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
      const res = await fetch(`${API_BASE}/billing/create-subscription/pinai`, {
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
      const subscriptionId = data.subscription_id

      // 2. Open Razorpay checkout interface
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mock_keys",
        subscription_id: subscriptionId,
        name: "Ayojit Intelligence",
        description: "PinAI Pro Subscription",
        handler: async function (response: any) {
          setSuccess(true)
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#EAB308"
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
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
            Thank you! You now have unlimited access to PinAI hyperlocal demographic query reports.
          </p>
          <a href="/apps/pinai" className="mt-6 inline-block border-2 border-black bg-yellow-300 px-6 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            Back to Search
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
          <a href="/apps/pinai" className="text-xs font-black underline uppercase">
            ← Cancel
          </a>
        </div>

        <h1 className="text-3xl font-black uppercase text-center border-b-4 border-black pb-2">Go Pro</h1>
        
        <div className="text-center my-6">
          <span className="text-5xl filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">📍</span>
          <h2 className="text-2xl font-black uppercase mt-2">PinAI Pro</h2>
          <p className="font-bold text-zinc-600 mt-1">Unlimited Hyperlocal Search Queries</p>
        </div>

        {/* Features list */}
        <div className="border-2 border-black bg-zinc-50 p-4 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <ul className="text-sm font-bold flex flex-col gap-2">
            <li>✨ Get unlimited pincode demographic lookups</li>
            <li>📊 Access full comparative location reports</li>
            <li>🚀 Zero lookup latency (dedicated databases)</li>
            <li>💳 Flexible ₹299/month plan (cancel anytime)</li>
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
          {loading ? "Processing..." : "Subscribe for ₹299/month"}
        </button>

        <p className="text-[10px] text-zinc-500 font-mono mt-4 text-center">
          Secured by Razorpay. Auto-renews monthly until cancelled. Refunds are subject to terms of service.
        </p>

      </div>
    </div>
  )
}
