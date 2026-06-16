'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * Referral Page — Users get their unique code, share it, and track earnings.
 */

export default function ReferralPage() {
  const supabase = createClient()
  const [code, setCode] = useState('')
  const [totalReferrals, setTotalReferrals] = useState(0)
  const [bonusEarned, setBonusEarned] = useState(0)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReferralData()
  }, [])

  const fetchReferralData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get or create referral code
    let { data: codeRow } = await supabase
      .from('referral_codes')
      .select('id, code')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!codeRow) {
      // Generate new code
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
      let newCode = ''
      for (let i = 0; i < 8; i++) {
        newCode += chars[Math.floor(Math.random() * chars.length)]
      }

      const { data: inserted } = await supabase
        .from('referral_codes')
        .insert({ user_id: user.id, code: newCode, bonus_queries: 5 })
        .select('id, code')
        .single()

      codeRow = inserted
    }

    if (codeRow) {
      setCode(codeRow.code)

      // Count claims
      const { count } = await supabase
        .from('referral_claims')
        .select('id', { count: 'exact', head: true })
        .eq('referral_code_id', codeRow.id)

      const claims = count || 0
      setTotalReferrals(claims)
      setBonusEarned(claims * 5)
    }

    setLoading(false)
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = `https://ayojit-intelligence.vercel.app/onboarding?ref=${code}`

  const shareWhatsApp = () => {
    const text = `Join Ayojit Intelligence — Free AI tools for Indian citizens. Use my code: ${code}\n${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareTwitter = () => {
    const text = `I'm using @AyojitAI — free AI tools for Indian farmers, MSMEs & citizens. Try it with my code: ${code}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black">
      <header className="border-b-4 border-black bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <a href="/dashboard" className="font-black text-lg uppercase tracking-tight">← Dashboard</a>
          <span className="font-bold text-xs uppercase text-zinc-500">Refer & Earn</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">🎁 Refer & Earn</h1>
        <p className="font-bold text-sm text-zinc-600 mb-8">
          Share your code. Get +5 bonus daily queries for every friend who signs up.
        </p>

        {loading ? (
          <p className="font-bold text-center py-12">Loading your referral code...</p>
        ) : (
          <>
            {/* Referral Code Card */}
            <div className="border-4 border-black bg-yellow-300 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-6">
              <p className="font-bold text-xs uppercase text-zinc-700 mb-2">Your Referral Code</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black tracking-[0.3em] flex-1 font-mono">{code}</span>
                <button
                  onClick={copyCode}
                  className="border-3 border-black bg-white px-4 py-2 font-black text-sm uppercase
                             shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                             hover:translate-y-[1px] transition-all"
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border-4 border-black bg-lime-300 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-bold text-[10px] uppercase text-zinc-700">Total Referrals</p>
                <p className="text-3xl font-black">{totalReferrals}</p>
              </div>
              <div className="border-4 border-black bg-amber-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-bold text-[10px] uppercase text-zinc-700">Bonus Queries Earned</p>
                <p className="text-3xl font-black">+{bonusEarned}</p>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="border-4 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="font-black text-sm uppercase mb-3">Share your code</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={shareWhatsApp}
                  className="flex-1 border-3 border-black bg-green-400 py-3 font-black text-sm uppercase
                             shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                             hover:translate-y-[1px] transition-all"
                >
                  💬 WhatsApp
                </button>
                <button
                  onClick={shareTwitter}
                  className="flex-1 border-3 border-black bg-blue-300 py-3 font-black text-sm uppercase
                             shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                             hover:translate-y-[1px] transition-all"
                >
                  🐦 Twitter
                </button>
                <button
                  onClick={copyCode}
                  className="flex-1 border-3 border-black bg-zinc-200 py-3 font-black text-sm uppercase
                             shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                             hover:translate-y-[1px] transition-all"
                >
                  🔗 Copy Link
                </button>
              </div>
            </div>

            {/* How it works */}
            <div className="border-4 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mt-6">
              <h2 className="font-black text-sm uppercase mb-3">How it works</h2>
              <ol className="space-y-2 text-sm font-medium text-zinc-600">
                <li className="flex items-start gap-2">
                  <span className="font-black border-2 border-black bg-yellow-300 px-2 py-0.5 text-xs flex-shrink-0">1</span>
                  Share your unique code with friends
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-black border-2 border-black bg-yellow-300 px-2 py-0.5 text-xs flex-shrink-0">2</span>
                  They sign up and enter your code during onboarding
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-black border-2 border-black bg-yellow-300 px-2 py-0.5 text-xs flex-shrink-0">3</span>
                  You earn +5 bonus daily queries across all apps
                </li>
              </ol>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
