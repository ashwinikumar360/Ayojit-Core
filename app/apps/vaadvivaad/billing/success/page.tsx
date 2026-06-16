'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const API_BASE = process.env.NEXT_PUBLIC_VAADVIVAAD_API_URL || "http://localhost:8000"

export default function VaadVivaadSuccess() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [disputeId, setDisputeId] = useState("")
  const [respondentName, setRespondentName] = useState("")
  const submissionAttempted = useRef(false)

  useEffect(() => {
    // Prevent double submission from React strict mode
    if (submissionAttempted.current) return
    submissionAttempted.current = true

    const checkoutId = searchParams.get('checkout_id') || searchParams.get('payment_id')
    const draftStr = localStorage.getItem("vaadvivaad_dispute_draft")

    if (!checkoutId || !draftStr) {
      // Nothing to process, go back to app
      router.push('/apps/vaadvivaad')
      return
    }

    const draft = JSON.parse(draftStr)
    setRespondentName(draft.respondent_name || "the other party")

    const submitPaymentDispute = async () => {
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token

        const res = await fetch(`${API_BASE}/dispute/file`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            ...draft,
            dodo_payment_id: checkoutId
          })
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.detail?.message || errData.detail || "Filing dispute case failed")
        }

        const data = await res.json()
        setDisputeId(data.dispute_id)
        localStorage.removeItem("vaadvivaad_dispute_draft")
      } catch (e: any) {
        setError(e.message || "An error occurred while filing the dispute")
      } finally {
        setLoading(false)
      }
    }

    submitPaymentDispute()
  }, [searchParams, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans text-black p-6">
        <div className="max-w-md border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <span className="text-5xl animate-spin inline-block mb-4">⌛</span>
          <h1 className="text-3xl font-black uppercase">Verifying Payment</h1>
          <p className="font-bold text-zinc-700 mt-2">
            Confirming Dodo Payments transaction and registering your MSME dispute case...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans text-black p-6">
        <div className="max-w-md border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <span className="text-5xl">❌</span>
          <h1 className="text-3xl font-black uppercase mt-4">Verification Error</h1>
          <p className="font-bold text-red-500 mt-2">
            {error}
          </p>
          <a href="/apps/vaadvivaad" className="mt-6 inline-block border-2 border-black bg-yellow-300 px-6 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Back to Form
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans text-black p-6">
      <div className="max-w-lg border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="text-center mb-6">
          <span className="text-5xl">🎉</span>
          <h1 className="text-3xl font-black uppercase mt-4">Dispute Filed Successfully</h1>
          <p className="font-bold text-zinc-700 mt-2">
            Your payment has been captured and the mediation case has been registered.
          </p>
        </div>

        <div className="border-2 border-black bg-lime-100 p-4 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-black uppercase text-zinc-500">Case Reference ID</div>
          <div className="text-xl font-black mt-1 font-mono">{disputeId}</div>
          <div className="text-xs text-zinc-600 mt-2 font-bold">
            Share this ID with {respondentName} to submit their statement at:
            <div className="bg-white border-2 border-black p-2 mt-1 font-mono text-[10px] break-all select-all font-bold">
              {window.location.origin}/apps/vaadvivaad/respond?id={disputeId}
            </div>
          </div>
        </div>

        <a href="/apps/vaadvivaad" className="w-full text-center border-4 border-black bg-yellow-300 hover:bg-yellow-400 p-3 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] block transition-all">
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
