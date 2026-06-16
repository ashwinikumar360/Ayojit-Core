'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import AssetAttribution from '../../components/AssetAttribution'

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Shop 🛍️' },
  { value: 'restaurant', label: 'Restaurant 🍔' },
  { value: 'pharmacy', label: 'Pharmacy 💊' },
  { value: 'education', label: 'Coaching Center 📚' },
  { value: 'clinic', label: 'Medical Clinic 🏥' },
  { value: 'logistics', label: 'Logistics Center 📦' },
]

const API_BASE = process.env.NEXT_PUBLIC_PINAI_API_URL || "http://localhost:8000"

export default function PinAI() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [pincode, setPincode] = useState("")
  const [businessType, setBusinessType] = useState("retail")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<any>(null)
  const [quotaUsed, setQuotaUsed] = useState(0)
  const [quotaLimit, setQuotaLimit] = useState(5)

  // Comparative states
  const [candidatePins, setCandidatePins] = useState("")
  const [compReport, setCompReport] = useState<any>(null)
  const [compLoading, setCompLoading] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchQuota(user.id)
      }
    })()
  }, [])

  const fetchQuota = async (userId: string) => {
    const { data: usage } = await supabase
      .from('usage_logs')
      .select('count')
      .eq('user_id', userId)
      .eq('app_id', 'pinai')
      .eq('action', 'query')
      .eq('usage_date', new Date().toISOString().slice(0, 10))
      .maybeSingle()
    
    setQuotaUsed(usage?.count || 0)
    
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('app_id', 'pinai')
      .maybeSingle()
      
    if (sub && sub.plan === 'paid' && sub.status === 'active') {
      setQuotaLimit(9999)
    } else {
      setQuotaLimit(5)
    }
  }

  const handleSearch = async () => {
    if (pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      setError("Please enter a valid 6-digit pincode")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch(`${API_BASE}/insight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          pincode,
          business_type: businessType
        })
      })

      if (res.status === 429) {
        const errorData = await res.json()
        setError(errorData.detail?.message || "Daily limit reached. Please upgrade to Pro.")
        setLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error("Pincode metrics not found in database")
      }

      const data = await res.json()
      setResult(data)

      if (user) {
        fetchQuota(user.id)
      }
    } catch (e: any) {
      setError(e.message || "An unexpected network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = async () => {
    if (!result) return
    const candidates = candidatePins.split(',').map(p => p.trim()).filter(p => p.length === 6)
    if (candidates.length === 0) {
      setError("Please enter at least one valid candidate pincode")
      return
    }

    setCompLoading(true)
    setError("")
    setCompReport(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch(`${API_BASE}/expansion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          current_pincode: pincode,
          candidate_pincodes: candidates
        })
      })

      if (!res.ok) {
        throw new Error("Expansion report compilation failed")
      }

      const data = await res.json()
      setCompReport(data)

      if (user) {
        fetchQuota(user.id)
      }
    } catch (e: any) {
      setError(e.message || "Expansion comparison failed")
    } finally {
      setCompLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation back link */}
        <div className="mb-6">
          <a href="/dashboard" className="inline-block border-2 border-black bg-white px-3 py-1 font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ← Back to Dashboard
          </a>
        </div>

        {/* Title Block */}
        <div className="border-4 border-black bg-yellow-300 p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-tight">📍 PinAI</h1>
          <p className="font-bold mt-1">Hyperlocal business intelligence and market viability by pincode</p>
        </div>

        {/* Asset Attribution Panel */}
        <AssetAttribution assetIds={['data.gov.in/pincode', 'data.gov.in/census2011', 'sarvamai/sarvam-2b-v0.5']} />

        {/* Search controls */}
        <div className="border-4 border-black bg-white p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-black uppercase mb-1">Enter Indian Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="e.g. 834001"
                className="w-full border-4 border-black p-2.5 font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-black uppercase mb-1">Select Business Category</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full border-4 border-black p-2.5 font-bold bg-white focus:outline-none">
                {BUSINESS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full border-4 border-black bg-orange-300 hover:bg-orange-400 p-2.5 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                {loading ? "Analyzing..." : "Analyze Location"}
              </button>
            </div>
          </div>

          {error && (
            <div className="border-4 border-black bg-red-400 p-4 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-bold uppercase">
              {error}
            </div>
          )}
        </div>

        {/* Results output */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Location & Recommendation Card */}
            <div className="md:col-span-2 border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xl font-black uppercase mb-2 border-b-2 border-black pb-1">
                {result.metrics?.location?.office}, {result.metrics?.location?.district}
              </h2>
              <p className="text-zinc-600 font-bold uppercase text-xs mb-4">
                Region: {result.metrics?.location?.state} ({result.metrics?.location?.division})
              </p>
              
              <div className="border-4 border-black bg-lime-200 p-4 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black text-xs uppercase text-zinc-700">AI Viability Recommendation</h3>
                <p className="font-bold mt-1 text-sm">{result.metrics?.recommendation}</p>
              </div>

              <div className="border-4 border-black bg-yellow-100 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black text-xs uppercase text-zinc-700">Consultancy Business Insight</h3>
                <p className="font-medium mt-1 text-sm text-zinc-800">{result.insight}</p>
              </div>
            </div>

            {/* Demographics indicators */}
            <div className="flex flex-col gap-4">
              <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs font-black uppercase text-zinc-500">Market Density Score</div>
                <div className="text-3xl font-black mt-1">{result.metrics?.business_signals?.market_density_score} / 10</div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1">Based on surrounding post density</div>
              </div>

              <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs font-black uppercase text-zinc-500">Delivery Status</div>
                <div className="text-2xl font-black mt-1 uppercase">{result.metrics?.business_signals?.delivery_active ? "🟢 Active" : "🔴 Limited"}</div>
              </div>

              <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs font-black uppercase text-zinc-500">Population Proxy</div>
                <div className="text-2xl font-black mt-1">{result.metrics?.business_signals?.population_proxy_enrolments?.toLocaleString()}</div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1">Aadhaar registrations in district</div>
              </div>
            </div>
          </div>
        )}

        {/* Expansion comparison panel */}
        {result && (
          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
            <h2 className="text-xl font-black uppercase mb-2 border-b-2 border-black pb-1">Evaluate Expansion Candidates</h2>
            <p className="text-sm font-bold text-zinc-600 mb-4">Compare {pincode} against candidate locations. Enter 6-digit pincodes separated by commas.</p>
            
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={candidatePins}
                onChange={(e) => setCandidatePins(e.target.value)}
                placeholder="e.g. 834002, 834003"
                className="flex-1 border-4 border-black p-2.5 font-bold focus:outline-none"
              />
              <button
                onClick={handleCompare}
                disabled={compLoading}
                className="border-4 border-black bg-black text-white px-6 py-2.5 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                {compLoading ? "Comparing..." : "Compare"}
              </button>
            </div>

            {compReport && (
              <div className="border-4 border-black bg-zinc-50 p-4 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black text-xs uppercase text-zinc-700">AI Comparison Analysis</h3>
                <p className="font-medium mt-1 text-sm text-zinc-800">{compReport.report}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  {compReport.comparisons.map((c: any, i: number) => (
                    <div key={i} className="border-2 border-black bg-white p-3">
                      <div className="text-xs font-black uppercase">{c.pincode}</div>
                      <div className="text-xs text-zinc-500 font-bold mt-0.5">{c.location?.office}</div>
                      <div className="text-lg font-black mt-2">Density: {c.business_signals?.market_density_score}/10</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer info panel */}
        <div className="border-4 border-black bg-white p-4 text-xs font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center">
          <div>
            Quota Usage: <span className="font-bold underline">{quotaLimit === 9999 ? "PRO (Unlimited)" : `${quotaUsed} / ${quotaLimit}`}</span> queries used today.
          </div>
          {quotaLimit !== 9999 && (
            <a href="/apps/pinai/billing" className="border-2 border-black bg-black text-white px-3 py-1 font-bold uppercase hover:bg-zinc-800">
              Go Pro
            </a>
          )}
        </div>

      </div>
    </div>
  )
}
