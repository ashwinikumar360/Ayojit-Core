'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import AssetAttribution from '../../components/AssetAttribution'

const DISPUTE_TYPES = [
  { value: 'payment_default', label: "Buyer didn't pay 💸" },
  { value: 'goods_not_delivered', label: 'Goods not delivered 📦' },
  { value: 'quality_issue', label: 'Product quality issue ⚠️' },
  { value: 'contract_breach', label: 'Contract violated 📄' },
  { value: 'refund_denied', label: 'Refund not given 💳' },
  { value: 'invoice_dispute', label: 'Invoice dispute 📊' },
]

const API_BASE = process.env.NEXT_PUBLIC_VAADVIVAAD_API_URL || "http://localhost:8000"

export default function VaadVivaad() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<any>(null)
  const [quotaUsed, setQuotaUsed] = useState(0)

  // Search/Track states
  const [trackId, setTrackId] = useState("")
  const [disputeInfo, setDisputeInfo] = useState<any>(null)
  const [trackLoading, setTrackLoading] = useState(false)

  // Form state
  const [form, setForm] = useState({
    dispute_type: "payment_default",
    amount: "",
    complainant_name: "",
    complainant_phone: "",
    complainant_statement: "",
    respondent_name: "",
    respondent_phone: "",
    language: "hi"
  })

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
      .from('lifetime_usage')
      .select('id')
      .eq('user_id', userId)
      .eq('app_id', 'vaadvivaad')
      .eq('action', 'dispute')
      .maybeSingle()

    setQuotaUsed(usage ? 1 : 0)
  }

  const handleFieldChange = (key: string, value: any) => {
    setForm(f => ({ ...f, [key]: value }))
  }

  const handleFileDispute = async () => {
    if (!form.complainant_name || !form.complainant_statement || !form.amount || !form.respondent_name) {
      setError("Please fill in all required fields marked with *")
      return
    }

    setLoading(true)
    setError("")
    setSuccess(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (quotaUsed >= 1) {
        // Save form draft to localStorage
        localStorage.setItem("vaadvivaad_dispute_draft", JSON.stringify({
          ...form,
          amount: parseFloat(form.amount)
        }))

        // Call backend API to create a one-time Dodo checkout session
        const res = await fetch(`${API_BASE}/billing/create-one-time-payment?amount=499&description=VaadVivaad%20Dispute`, {
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
      } else {
        // Free dispute
        await submitDispute({
          ...form,
          amount: parseFloat(form.amount)
        }, token)
      }
    } catch (e: any) {
      setError(e.message || "Filing dispute failed")
      setLoading(false)
    }
  }

  const submitDispute = async (payload: any, token: string | undefined) => {
    const res = await fetch(`${API_BASE}/dispute/file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.detail?.message || errorData.detail || "Filing failed")
    }

    const data = await res.json()
    setSuccess(data)
    if (user) {
      fetchQuota(user.id)
    }
    setLoading(false)
  }

  const handleTrackDispute = async () => {
    if (!trackId.trim()) return
    setTrackLoading(true)
    setDisputeInfo(null)
    setError("")

    try {
      const res = await fetch(`${API_BASE}/dispute/${trackId}`)
      if (!res.ok) {
        throw new Error("Dispute not found. Please verify the ID.")
      }
      const data = await res.json()
      setDisputeInfo(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTrackLoading(false)
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
        <div className="border-4 border-black bg-red-300 p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-tight">⚖️ VaadVivaad</h1>
          <p className="font-bold mt-1">AI-Powered mediation and dispute resolution for Indian MSME traders • Powered by local/open rule engine</p>
        </div>

        {/* Asset Attribution Panel */}
        <AssetAttribution assetIds={['data.gov.in/legal_judgments', 'sarvamai/sarvam-2b-v0.5', 'IndicTrans2']} />

        {/* Two-Column split: Filing Form & Track panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Dispute Filing Form */}
          <div className="md:col-span-2 border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-1">File a Trade Dispute</h2>
            
            {success ? (
              <div className="border-4 border-black bg-lime-200 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
                <span className="text-4xl">🎉</span>
                <h3 className="text-2xl font-black uppercase mt-2">Dispute Filed Successfully</h3>
                <p className="font-bold mt-1">Dispute Reference ID: <span className="underline">{success.dispute_id}</span></p>
                <div className="bg-white border-2 border-black p-3 my-4 font-mono text-xs text-left">
                  Share this ID with the other party to submit their statement at:<br/>
                  <span className="font-bold">{window.location.origin}/apps/vaadvivaad/respond?id={success.dispute_id}</span>
                </div>
                <button
                  onClick={() => { setSuccess(null); setForm(f => ({ ...f, complainant_statement: "" })) }}
                  className="border-2 border-black bg-white px-4 py-2 font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  File Another Dispute
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      value={form.complainant_name}
                      onChange={(e) => handleFieldChange("complainant_name", e.target.value)}
                      placeholder="e.g. Ramesh Singh"
                      className="w-full border-2 border-black p-2 font-bold focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Your Mobile Phone *</label>
                    <input
                      type="text"
                      value={form.complainant_phone}
                      onChange={(e) => handleFieldChange("complainant_phone", e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full border-2 border-black p-2 font-bold focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Dispute Classification *</label>
                    <select
                      value={form.dispute_type}
                      onChange={(e) => handleFieldChange("dispute_type", e.target.value)}
                      className="w-full border-2 border-black p-2 font-bold bg-white text-sm">
                      {DISPUTE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Disputed Amount (₹) *</label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => handleFieldChange("amount", e.target.value)}
                      placeholder="INR Amount"
                      className="w-full border-2 border-black p-2 font-bold focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Output Language</label>
                    <select
                      value={form.language}
                      onChange={(e) => handleFieldChange("language", e.target.value)}
                      className="w-full border-2 border-black p-2 font-bold bg-white text-sm">
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="en">English (English)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Other Party (Respondent) Name *</label>
                    <input
                      type="text"
                      value={form.respondent_name}
                      onChange={(e) => handleFieldChange("respondent_name", e.target.value)}
                      placeholder="e.g. Verma Traders"
                      className="w-full border-2 border-black p-2 font-bold focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Respondent Phone</label>
                    <input
                      type="text"
                      value={form.respondent_phone}
                      onChange={(e) => handleFieldChange("respondent_phone", e.target.value)}
                      placeholder="Mobile contact"
                      className="w-full border-2 border-black p-2 font-bold focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-1">Describe what happened *</label>
                  <textarea
                    value={form.complainant_statement}
                    onChange={(e) => handleFieldChange("complainant_statement", e.target.value)}
                    placeholder="Be specific about dates, agreed contract terms, payment timelines, and quality deficiencies..."
                    rows={4}
                    className="w-full border-2 border-black p-2 font-bold focus:outline-none text-sm"
                  />
                </div>

                {error && !disputeInfo && (
                  <div className="border-2 border-black bg-red-400 p-3 text-xs font-bold uppercase">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleFileDispute}
                  disabled={loading}
                  className="w-full border-4 border-black bg-orange-300 hover:bg-orange-400 p-3 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                  {loading ? "Filing Case..." : quotaUsed >= 1 ? "File Case (Pay ₹499)" : "File Case (1st Dispute Free)"}
                </button>
              </div>
            )}
          </div>

          {/* Dispute Status Tracker Panel */}
          <div className="flex flex-col gap-6">
            
            {/* Tracking Search box */}
            <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-black uppercase mb-3 border-b-2 border-black pb-1">Track Dispute Case</h2>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value.toUpperCase())}
                  placeholder="Enter Dispute ID (e.g. VV12A4F8)"
                  className="border-2 border-black p-2 font-bold focus:outline-none text-xs"
                />
                <button
                  onClick={handleTrackDispute}
                  disabled={trackLoading}
                  className="border-2 border-black bg-black text-white p-2 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {trackLoading ? "Searching..." : "Search Status"}
                </button>
              </div>
            </div>

            {/* Quota details card */}
            <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-xs font-black uppercase text-zinc-500">MSME-ODR Quota</div>
              <div className="text-xl font-black mt-1">{quotaUsed === 0 ? "1 Free Dispute Available" : "Free Dispute Used"}</div>
              <p className="text-[10px] text-zinc-400 mt-1">Your first filed case is free. Subsequent disputes require a one-time mediation filing fee of ₹499.</p>
            </div>

          </div>
        </div>

        {/* Dispute Details View Output */}
        {disputeInfo && (
          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
              <div>
                <h2 className="text-2xl font-black uppercase">Case Status Details</h2>
                <p className="font-bold text-xs text-zinc-500">Case ID: {disputeInfo.id}</p>
              </div>
              <span className={`border-2 border-black px-3 py-1 font-black text-xs uppercase ${
                disputeInfo.status === 'resolved' ? 'bg-lime-300' : 'bg-yellow-300'
              }`}>
                {disputeInfo.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-black text-sm uppercase text-zinc-700">Complainant: {disputeInfo.complainant_name}</h3>
                <p className="border-2 border-black bg-zinc-50 p-3 text-xs leading-relaxed max-h-[120px] overflow-y-auto mt-1 font-medium text-zinc-600">
                  {disputeInfo.complainant_statement}
                </p>
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-zinc-700">Respondent: {disputeInfo.respondent_name}</h3>
                <p className="border-2 border-black bg-zinc-50 p-3 text-xs leading-relaxed max-h-[120px] overflow-y-auto mt-1 font-medium text-zinc-600">
                  {disputeInfo.respondent_statement || "Waiting for respondent statement submission..."}
                </p>
              </div>
            </div>

            {disputeInfo.status === 'resolved' && (
              <div className="border-4 border-black bg-lime-100 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                <h3 className="font-black text-sm uppercase text-zinc-700">AI Mediation Determination</h3>
                <pre className="font-mono text-xs font-bold leading-normal mt-2 overflow-x-auto">
                  {disputeInfo.resolution}
                </pre>
                
                <a
                  href={`${API_BASE}/dispute/${disputeInfo.id}/pdf`}
                  className="mt-4 inline-block border-2 border-black bg-black text-white px-4 py-2 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  Download Mediation PDF Report
                </a>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
