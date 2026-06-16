'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_VAADVIVAAD_API_URL || "http://localhost:8000"

function RespondForm() {
  const searchParams = useSearchParams()
  const disputeId = searchParams.get('id') || ""

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  
  const [dispute, setDispute] = useState<any>(null)
  const [statement, setStatement] = useState("")

  useEffect(() => {
    if (disputeId) {
      fetchDispute()
    }
  }, [disputeId])

  const fetchDispute = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/dispute/${disputeId}`)
      if (!res.ok) {
        throw new Error("Dispute not found. Verify the URL reference link.")
      }
      const data = await res.json()
      setDispute(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitDefense = async () => {
    if (!statement.trim()) {
      setError("Please describe your side of the dispute statement")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`${API_BASE}/dispute/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispute_id: disputeId,
          respondent_statement: statement
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail?.message || "Failed to register response")
      }

      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans text-black p-6">
        <div className="max-w-md border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <span className="text-5xl">⚖️</span>
          <h1 className="text-3xl font-black uppercase mt-4">Defense Registered</h1>
          <p className="font-bold text-zinc-700 mt-2">
            Your statement has been submitted. The Sarvam-105B AI mediation engine is now analyzing the dispute.
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            Please coordinate with the complainant. The final PDF report will be downloadable under Case ID: <span className="underline font-bold">{disputeId}</span> shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-xl mx-auto border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black uppercase text-center border-b-4 border-black pb-2">Respond to Dispute</h1>
        
        {dispute ? (
          <div className="mt-6">
            {/* Complainant claim card */}
            <div className="border-2 border-black bg-yellow-100 p-4 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="font-black text-xs uppercase text-zinc-700">Filer Claim: {dispute.complainant_name}</h3>
              <p className="text-sm font-black mt-1">Disputed Amount: INR {dispute.amount?.toLocaleString()}</p>
              <p className="text-xs font-bold text-zinc-600 mt-2">Statement of complaint:</p>
              <p className="text-xs italic bg-white p-2 border border-black mt-1 text-zinc-700 max-h-[120px] overflow-y-auto leading-relaxed font-medium">
                {dispute.complainant_statement}
              </p>
            </div>

            {/* Response Form */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-black uppercase mb-1">Your Defense Explanation Statement *</label>
                <textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Describe your side of the conflict. Address the dates, delivery failures, or invoicing disputes mentioned by the filer..."
                  rows={5}
                  className="w-full border-2 border-black p-2 font-bold focus:outline-none text-sm bg-zinc-50"
                />
              </div>

              {error && (
                <div className="border-2 border-black bg-red-400 p-3 text-xs font-bold uppercase">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmitDefense}
                disabled={loading}
                className="w-full border-4 border-black bg-orange-300 hover:bg-orange-400 p-3 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                {loading ? "Registering Statement..." : "Submit Response & Run AI Mediation"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            {loading ? (
              <p className="font-black uppercase">Loading dispute case metadata...</p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="font-bold text-red-500 uppercase text-sm">{error || "Invalid dispute URL link."}</p>
                <p className="text-xs text-zinc-500 font-medium">Please verify the Dispute ID link in your browser search bar.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default function VaadVivaadRespond() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans text-black">
        <div className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xl font-black">Loading dispute details...</p>
        </div>
      </div>
    }>
      <RespondForm />
    </Suspense>
  )
}
