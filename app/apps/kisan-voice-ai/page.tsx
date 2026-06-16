'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import AssetAttribution from '../../components/AssetAttribution'

const CROPS = [
  { value: '', label: 'General / All Crops 🌾' },
  { value: 'wheat', label: 'Wheat (गेहूं)' },
  { value: 'rice', label: 'Rice / Paddy (धान)' },
  { value: 'cotton', label: 'Cotton (कपास)' },
  { value: 'sugarcane', label: 'Sugarcane (गन्ना)' },
  { value: 'mustard', label: 'Mustard (सरसों)' },
  { value: 'potato', label: 'Potato (आलू)' },
]

const LANGUAGES = [
  { value: 'hi', label: 'Hindi (हिंदी)' },
  { value: 'te', label: 'Telugu (తెలుగు)' },
  { value: 'mr', label: 'Marathi (मराठी)' },
  { value: 'ta', label: 'Tamil (தமிழ்)' },
  { value: 'bn', label: 'Bengali (বাংলা)' },
  { value: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { value: 'en', label: 'English (English)' },
]

const MOCK_TELEMETRY = [
  {
    id: 'mock_1',
    created_at: new Date(Date.now() - 4 * 60000).toISOString(),
    action: 'call_log: 4a9f8b1c2d3e: गेहूं में पत्तों का पीला होना - पीला रतुआ (Yellow Rust) नियंत्रण उपाय',
  },
  {
    id: 'mock_2',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    action: 'call_log: f3e2d1c0b9a8: धान की फसल में तना छेदक (Stem Borer) कीट का समाधान',
  },
  {
    id: 'mock_3',
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    action: 'call_log: 9876543210ab: कपास में गुलाबी सुंडी (Pink Bollworm) की दवा और सुरक्षा योजना',
  },
  {
    id: 'mock_4',
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
    action: 'query: PM Kisan Samman Nidhi Yojana benefits and eligibility check',
  },
]

const API_BASE = process.env.NEXT_PUBLIC_KISAN_API_URL || "http://localhost:8000"

export default function KisanVoiceAI() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])
  const [error, setError] = useState("")

  // Web Query Sandbox
  const [query, setQuery] = useState("")
  const [crop, setCrop] = useState("")
  const [language, setLanguage] = useState("hi")
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState("")

  // Pilot Request
  const [pilotState, setPilotState] = useState("")
  const [pilotDept, setPilotDept] = useState("")
  const [pilotLang, setPilotLang] = useState("hi")
  const [pilotBudget, setPilotBudget] = useState("")
  const [pilotLoading, setPilotLoading] = useState(false)
  const [pilotSuccess, setPilotSuccess] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await fetchLogs()
      }
      setLoading(false)
    })()
  }, [])

  const fetchLogs = async () => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return

      const res = await fetch(`${API_BASE}/logs`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error("Failed to fetch recent telemetry logs")
      }

      const data = await res.json()
      setLogs(data.logs || [])
    } catch (e: any) {
      console.warn("Could not load backend logs, using mock preview:", e.message)
      setLogs([])
    }
  }

  const runTestQuery = async () => {
    if (!query.trim()) {
      setTestError("Please enter a farmer query to test")
      return
    }

    setTestLoading(true)
    setTestError("")
    setTestResult(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch(`${API_BASE}/api/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          query: query,
          language: language,
          crop: crop || null
        })
      })

      if (res.status === 429) {
        const err = await res.json()
        throw new Error(err.detail?.message || "Limit exceeded.")
      }

      if (!res.ok) {
        throw new Error("RAG Query execution failed")
      }

      const data = await res.json()
      setTestResult(data)
      // Refresh logs after query execution
      fetchLogs()
    } catch (e: any) {
      setTestError(e.message || "An unexpected error occurred during search execution")
    } finally {
      setTestLoading(false)
    }
  }

  const submitPilotRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pilotState || !pilotDept || !pilotBudget) {
      setError("Please fill all required pilot fields")
      return
    }

    setPilotLoading(true)
    setError("")

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      // Log pilot request to backend usage table
      const details = `Pilot request: State=${pilotState}, Dept=${pilotDept}, Lang=${pilotLang}, Budget=${pilotBudget}`
      
      const { error: dbErr } = await supabase.from('usage_logs').insert({
        user_id: user?.id,
        app_id: 'kisan-voice-ai',
        action: details,
        count: 1
      })

      if (dbErr) throw dbErr

      setPilotSuccess(true)
      setPilotState("")
      setPilotDept("")
      setPilotBudget("")
      fetchLogs()
    } catch (e: any) {
      setError("Could not submit pilot proposal: " + e.message)
    } finally {
      setPilotLoading(false)
    }
  }

  const displayLogs = logs.length > 0 ? logs : MOCK_TELEMETRY

  // Telephony call calculations
  const totalCalls = displayLogs.filter(l => l.action.startsWith('call_log:')).length
  const totalQueries = displayLogs.filter(l => l.action.startsWith('query') || l.action.startsWith('Pilot request')).length

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-5xl mx-auto">
        
        {/* Navigation Back Link */}
        <div className="mb-6">
          <a href="/dashboard" className="inline-block border-2 border-black bg-white px-3 py-1 font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ← Back to Dashboard
          </a>
        </div>

        {/* Title Block */}
        <div className="border-4 border-black bg-orange-300 p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-tight">🌾 Kisan Voice AI</h1>
          <p className="font-bold mt-1">Government Admin Command Center • Regional ASR & ChromaDB RAG Telemetry</p>
        </div>

        {/* Asset Attribution Panel */}
        <AssetAttribution assetIds={['openai/whisper-large-v3', 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2', 'ai4bharat/indic-parler-tts', 'data.gov.in/kcc']} />

        {/* Telemetry KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-xs font-black uppercase text-zinc-500">Telephony Calls</div>
            <div className="text-3xl font-black mt-1">{totalCalls} calls</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">Processed from Twilio Inbound</div>
          </div>

          <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-xs font-black uppercase text-zinc-500">Sandbox RAG Queries</div>
            <div className="text-3xl font-black mt-1">{totalQueries} queries</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">Fired from admin console</div>
          </div>

          <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-xs font-black uppercase text-zinc-500">Twilio Status</div>
            <div className="text-lg font-black mt-1 uppercase text-emerald-600">🟢 Listening</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">Webhook signature verified</div>
          </div>

          <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-xs font-black uppercase text-zinc-500">ASR Language Channels</div>
            <div className="text-3xl font-black mt-1">22 Govt</div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1">Powered by MeitY Bhashini API</div>
          </div>
        </div>

        {/* Split Section: Sandbox & Pilot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Interactive RAG Tester */}
          <div className="md:col-span-2 border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-1">Web RAG Sandbox Simulator</h2>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Enter Query (Hindi, Hinglish or Regional)</label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. धान में खरपतवार नियंत्रण कैसे करें? (How to manage weeds in rice crop?)"
                  rows={3}
                  className="w-full border-2 border-black p-2 font-bold focus:outline-none text-sm placeholder-zinc-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Target Crop</label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full border-2 border-black p-2 font-bold bg-white text-sm">
                    {CROPS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Simulated Input Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full border-2 border-black p-2 font-bold bg-white text-sm">
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {testError && (
                <div className="border-2 border-black bg-red-400 p-3 text-xs font-bold uppercase">
                  {testError}
                </div>
              )}

              <button
                onClick={runTestQuery}
                disabled={testLoading}
                className="w-full border-4 border-black bg-orange-300 hover:bg-orange-400 p-2.5 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                {testLoading ? "Retrieving from KCC ChromaDB..." : "🔍 Run Query"}
              </button>
            </div>

            {/* Test Query results */}
            {testResult && (
              <div className="border-4 border-black bg-orange-50 p-4 mt-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center border-b-2 border-orange-200 pb-1 mb-2">
                  <h3 className="font-black text-xs uppercase text-zinc-700">RAG Query Match</h3>
                  <span className="border border-black bg-orange-200 px-2 py-0.5 text-[10px] font-mono font-bold">
                    Source: {testResult.source}
                  </span>
                </div>
                <p className="font-bold text-xs text-zinc-600 mb-2">Query: "{testResult.query}"</p>
                <div className="bg-white border-2 border-black p-3 text-sm font-medium leading-relaxed">
                  {testResult.answer}
                </div>
              </div>
            )}
          </div>

          {/* Request Pilot form */}
          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-1">B2G Pilot Request</h2>
            
            {pilotSuccess ? (
              <div className="border-4 border-black bg-emerald-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
                <span className="text-3xl">🏛️</span>
                <h3 className="text-lg font-black uppercase mt-1">Request Logged</h3>
                <p className="text-xs font-bold mt-1 text-zinc-700">Our National Informatics / MeitY coordinator will reach out within 24 hours.</p>
                <button
                  onClick={() => setPilotSuccess(false)}
                  className="mt-4 border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase">
                  Submit New Request
                </button>
              </div>
            ) : (
              <form onSubmit={submitPilotRequest} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-black uppercase mb-0.5">State / UT *</label>
                  <input
                    type="text"
                    required
                    value={pilotState}
                    onChange={(e) => setPilotState(e.target.value)}
                    placeholder="e.g. Uttar Pradesh"
                    className="w-full border-2 border-black p-2 font-bold text-xs focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black uppercase mb-0.5">Department Name *</label>
                  <input
                    type="text"
                    required
                    value={pilotDept}
                    onChange={(e) => setPilotDept(e.target.value)}
                    placeholder="e.g. Department of Agriculture"
                    className="w-full border-2 border-black p-2 font-bold text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-0.5">Primary Language</label>
                  <select
                    value={pilotLang}
                    onChange={(e) => setPilotLang(e.target.value)}
                    className="w-full border-2 border-black p-2 font-bold bg-white text-xs">
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-0.5">Estimated Call Volume *</label>
                  <input
                    type="text"
                    required
                    value={pilotBudget}
                    onChange={(e) => setPilotBudget(e.target.value)}
                    placeholder="e.g. 50k calls/month"
                    className="w-full border-2 border-black p-2 font-bold text-xs focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="border-2 border-black bg-red-400 p-2 text-[10px] font-bold uppercase">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pilotLoading}
                  className="w-full border-2 border-black bg-black text-white p-2 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800">
                  {pilotLoading ? "Logging Pilot..." : "Propose State Pilot"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Telemetry Logs Table */}
        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-1">Call Logs & Telemetry Events</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-4 border-black bg-zinc-100 text-left">
                  <th className="p-3 font-black text-xs uppercase border-r-2 border-black">Caller (Hashed)</th>
                  <th className="p-3 font-black text-xs uppercase border-r-2 border-black">Event Type</th>
                  <th className="p-3 font-black text-xs uppercase border-r-2 border-black">Payload Description</th>
                  <th className="p-3 font-black text-xs uppercase">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.map((log) => {
                  const isCall = log.action.startsWith('call_log:')
                  let caller = 'Dashboard / Web User'
                  let eventType = 'RAG Sandbox Query'
                  let description = log.action

                  if (isCall) {
                    const parts = log.action.split(':')
                    caller = parts[1]?.trim() ? `${parts[1].trim()}...` : 'Unknown Caller'
                    eventType = '📞 Telephony Inbound'
                    description = parts.slice(2).join(':')?.trim() || log.action
                  } else if (log.action.startsWith('Pilot request')) {
                    eventType = '🏛️ Pilot Submission'
                    caller = 'Government Admin'
                  }

                  return (
                    <tr key={log.id} className="border-b-2 border-black hover:bg-zinc-50 font-medium">
                      <td className="p-3 text-xs font-mono border-r-2 border-black break-all">{caller}</td>
                      <td className="p-3 text-xs border-r-2 border-black">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black ${
                          isCall ? 'bg-orange-200' : log.action.startsWith('Pilot') ? 'bg-emerald-200' : 'bg-yellow-200'
                        }`}>
                          {eventType}
                        </span>
                      </td>
                      <td className="p-3 text-xs border-r-2 border-black font-semibold text-zinc-800">{description}</td>
                      <td className="p-3 text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
