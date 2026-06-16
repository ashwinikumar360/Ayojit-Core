'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import AssetAttribution from '../../components/AssetAttribution'

const DOC_TYPES = [
  { value: 'general', label: 'Auto-Detect 📄' },
  { value: 'aadhaar', label: 'Aadhaar Card 🪪' },
  { value: 'pan', label: 'PAN Card 💳' },
  { value: 'ration_card', label: 'Ration Card 🌾' },
  { value: 'land_record', label: 'Land Record 🗺️' },
  { value: 'hospital_form', label: 'Hospital Form 🏥' },
  { value: 'pension_form', label: 'Pension Form 👴' },
]

const API_BASE = process.env.NEXT_PUBLIC_DOCPATRAM_API_URL || "http://localhost:8000"

export default function DocPatram() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState("general")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [quotaUsed, setQuotaUsed] = useState(0)
  const [quotaLimit, setQuotaLimit] = useState(10)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchDocuments(user.id)
        fetchQuota(user.id)
      }
    })()
  }, [])

  const fetchDocuments = async (userId: string) => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setDocuments(data || [])
  }

  const fetchQuota = async (userId: string) => {
    const { data: usage } = await supabase
      .from('usage_logs')
      .select('count')
      .eq('user_id', userId)
      .eq('app_id', 'docpatram')
      .eq('action', 'doc_gen')
      .eq('usage_date', new Date().toISOString().slice(0, 10))
      .maybeSingle()

    setQuotaUsed(usage?.count || 0)

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('app_id', 'docpatram')
      .maybeSingle()

    if (sub && sub.plan === 'paid' && sub.status === 'active') {
      setQuotaLimit(9999)
    } else {
      setQuotaLimit(10)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleExtract = async () => {
    if (!file) {
      setError("Please select a document file to upload")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("document_type", docType)
    formData.append("anonymize", "true")

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch(`${API_BASE}/extract`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      })

      if (res.status === 429) {
        const errorData = await res.json()
        setError(errorData.detail?.message || "Daily limit reached. Please upgrade to Pro.")
        setLoading(false)
        return
      }

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Document extraction failed")
      }

      const data = await res.json()
      setResult(data)

      if (user) {
        fetchDocuments(user.id)
        fetchQuota(user.id)
      }
    } catch (e: any) {
      setError(e.message || "An unexpected network error occurred")
    } finally {
      setLoading(false)
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
        <div className="border-4 border-black bg-lime-300 p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-tight">📄 DocPatram</h1>
          <p className="font-bold mt-1">Automatic structured text and field extraction for Indian Government documents</p>
        </div>

        {/* Asset Attribution Panel */}
        <AssetAttribution assetIds={['data.gov.in/public_templates', 'IndicTrans2']} />

        {/* Uploader interface */}
        <div className="border-4 border-black bg-white p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-black uppercase mb-1">Select Document Category</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full border-4 border-black p-2.5 font-bold bg-white focus:outline-none">
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-sm font-black uppercase mb-1">Upload File (Max 10MB)</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
                onChange={handleFileChange}
                className="border-2 border-dashed border-black p-1 font-bold text-sm bg-zinc-50"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExtract}
                disabled={loading || !file}
                className="w-full border-4 border-black bg-orange-300 hover:bg-orange-400 p-2.5 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all">
                {loading ? "Processing Document..." : "Extract Fields"}
              </button>
            </div>
          </div>

          {error && (
            <div className="border-4 border-black bg-red-400 p-4 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-bold uppercase">
              {error}
            </div>
          )}
        </div>

        {/* Results layout */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2 border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xl font-black uppercase mb-2 border-b-2 border-black pb-1">Structured Extraction Result</h2>
              <pre className="border-4 border-black bg-zinc-50 p-4 overflow-auto max-h-[300px] text-xs font-mono font-bold leading-normal">
                {JSON.stringify(result.structured_extraction, null, 2)}
              </pre>

              <h2 className="text-lg font-black uppercase mt-6 mb-2 border-b-2 border-black pb-1">Anonymized OCR Text</h2>
              <p className="border-2 border-black bg-zinc-50 p-3 text-sm leading-relaxed max-h-[150px] overflow-y-auto font-medium text-zinc-700">
                {result.ocr_text}
              </p>
            </div>

            {/* Privacy Shield Info */}
            <div className="flex flex-col gap-4">
              <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs font-black uppercase text-zinc-500">DPDP Privacy Shield</div>
                <div className="text-3xl font-black mt-1">{result.anonymization?.pii_entities_found}</div>
                <div className="text-xs font-bold text-zinc-600 mt-1 uppercase">PII items automatically masked</div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1">Presidio/ARX compliance applied</div>
              </div>

              <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs font-black uppercase text-zinc-500">Document Type parsed</div>
                <div className="text-xl font-black mt-1 uppercase">{result.document_type}</div>
              </div>

              {result.document_url && (
                <a
                  href={result.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="border-4 border-black bg-black text-white text-center p-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                  Download Scanned File
                </a>
              )}
            </div>
          </div>
        )}

        {/* History Document Gallery */}
        {documents.length > 0 && (
          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
            <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-1">My Processed Documents</h2>
            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2">
              {documents.map((doc, idx) => (
                <div key={doc.id} className="border-2 border-black bg-zinc-50 p-3 flex justify-between items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div>
                    <span className="font-mono text-xs text-zinc-400 mr-2">#{documents.length - idx}</span>
                    <span className="font-bold text-sm uppercase">{doc.title}</span>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-black bg-white hover:bg-zinc-100 px-3 py-1 font-bold text-xs uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    Download File
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer quota panel */}
        <div className="border-4 border-black bg-white p-4 text-xs font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center">
          <div>
            Quota Usage: <span className="font-bold underline">{quotaLimit === 9999 ? "PRO (Unlimited)" : `${quotaUsed} / ${quotaLimit}`}</span> documents used today.
          </div>
          {quotaLimit !== 9999 && (
            <a href="/apps/docpatram/billing" className="border-2 border-black bg-black text-white px-3 py-1 font-bold uppercase hover:bg-zinc-800">
              Go Pro
            </a>
          )}
        </div>

      </div>
    </div>
  )
}
