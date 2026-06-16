'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import AssetAttribution from '../../components/AssetAttribution'

const STYLES = [
  { id: 'art', label: '🎨 Digital Art' },
  { id: 'portrait', label: '📸 Portrait' },
  { id: 'cartoon', label: '🖼️ Cartoon' },
  { id: 'traditional', label: '🏛️ Traditional' },
  { id: 'wedding', label: '💍 Wedding' },
  { id: 'nature', label: '🌿 Nature' },
]

const SIZES = [
  { id: 'square', label: '■ Square (Instagram)' },
  { id: 'portrait', label: '▬ Portrait (Story)' },
  { id: 'landscape', label: '▬ Landscape (Banner)' },
]

const EXAMPLES = [
  "एक राजस्थानी दुल्हन, रंगीन लहंगा, हवेली के सामने",
  "वाराणसी के घाट पर सूर्यास्त, नाव, दीपक",
  "एक किसान अपने खेत में, सूरजमुखी के फूल, सुनहरी धूप",
  "ताजमहल, पूर्णिमा की रात, प्रतिबिंब",
]

const API_BASE = process.env.NEXT_PUBLIC_HINDIDIFF_API_URL || "http://localhost:8000"

export default function HindiDiff() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("art")
  const [size, setSize] = useState("square")
  const [variations, setVariations] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<any>(null)
  const [gallery, setGallery] = useState<any[]>([])
  const [quotaUsed, setQuotaUsed] = useState(0)
  const [quotaLimit, setQuotaLimit] = useState(10)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchGallery(user.id)
        fetchQuota(user.id)
      }
    })()
  }, [])

  const fetchGallery = async (userId: string) => {
    const { data } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12)
    setGallery(data || [])
  }

  const fetchQuota = async (userId: string) => {
    const { data: usage } = await supabase
      .from('usage_logs')
      .select('count')
      .eq('user_id', userId)
      .eq('app_id', 'hindidiff')
      .eq('action', 'image_gen')
      .eq('usage_date', new Date().toISOString().slice(0, 10))
      .maybeSingle()
    
    setQuotaUsed(usage?.count || 0)
    
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('app_id', 'hindidiff')
      .maybeSingle()
      
    if (sub && sub.plan === 'paid' && sub.status === 'active') {
      setQuotaLimit(9999) // Unlimited
    } else {
      setQuotaLimit(10)
    }
  }

  const generate = async () => {
    if (!prompt.trim()) {
      setError("Please describe what image you want to generate")
      return
    }
    
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: prompt,
          style: style,
          size: size,
          variations: Number(variations)
        })
      })

      if (res.status === 429) {
        const errorData = await res.json()
        setError(errorData.detail?.message || "Daily limit reached. Please upgrade to Pro.")
        setLoading(false)
        return
      }

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Generation failed")
      }

      const data = await res.json()
      setResult(data)
      
      // Refresh user stats
      if (user) {
        fetchGallery(user.id)
        fetchQuota(user.id)
      }
    } catch (e: any) {
      setError(e.message || "An unexpected network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = (url: string, seed: number) => {
    const a = document.createElement("a")
    a.href = url
    a.download = `hindidiff_${seed}.png`
    a.target = "_blank"
    a.click()
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Back Link */}
        <div className="mb-6">
          <a href="/dashboard" className="inline-block border-2 border-black bg-white px-3 py-1 font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ← Back to Dashboard
          </a>
        </div>

        {/* Title Block */}
        <div className="border-4 border-black bg-amber-200 p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-tight">🎨 HindiDiff</h1>
          <p className="font-bold mt-1">Write in Hindi / Hinglish, get stunning AI images • Powered by commercially open models</p>
        </div>

        {/* Asset Attribution Panel */}
        <AssetAttribution assetIds={['black-forest-labs/FLUX.1-schnell']} />

        {/* Form Container */}
        <div className="border-4 border-black bg-white p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-4">
            <label className="block text-sm font-black uppercase mb-1">Describe Your Image in Hindi/Hinglish</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. एक किसान अपने खेत में, सूरजमुखी के फूल, सुनहरी धूप"
              rows={3}
              className="w-full border-4 border-black p-3 font-bold text-base focus:outline-none placeholder-zinc-400"
            />
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap gap-2 mb-6">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="border-2 border-black bg-zinc-100 hover:bg-zinc-200 px-3 py-1 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                {ex.slice(0, 25)}...
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Style Selector */}
            <div>
              <label className="block text-sm font-black uppercase mb-1">Style Selection</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`border-2 border-black p-2 font-bold text-xs uppercase text-left transition-all ${
                      style === s.id ? 'bg-amber-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-zinc-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <label className="block text-sm font-black uppercase mb-1">Dimensions</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full border-4 border-black p-2.5 font-bold text-sm bg-white focus:outline-none">
                {SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            {/* Variations */}
            <div>
              <label className="block text-sm font-black uppercase mb-1">Variations count</label>
              <select
                value={variations}
                onChange={(e) => setVariations(Number(e.target.value))}
                className="w-full border-4 border-black p-2.5 font-bold text-sm bg-white focus:outline-none">
                {[1, 2, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="border-4 border-black bg-red-400 p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-sm uppercase">Error Code: Limit Exceeded / Failure</p>
              <p className="font-bold mt-1 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="w-full border-4 border-black bg-orange-300 hover:bg-orange-400 p-3 font-black text-lg uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all">
            {loading ? "Generating Image Assets..." : "✨ Generate Image"}
          </button>
        </div>

        {/* Output Screen */}
        {result && (
          <div className="border-4 border-black bg-white p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-1">Generation Outputs</h2>
            <div className={`grid gap-4 ${result.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {result.images.map((img: any, idx: number) => (
                <div key={idx} className="border-4 border-black relative group">
                  <img src={img.image_url} alt="Generation Output" className="w-full h-auto object-cover" />
                  <button
                    onClick={() => downloadImage(img.image_url, img.seed)}
                    className="absolute bottom-4 right-4 border-2 border-black bg-black text-white px-3 py-1 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery / History View */}
        {gallery.length > 0 && (
          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
            <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-1">My Generation Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {gallery.map(gen => (
                <div key={gen.id} className="border-2 border-black relative group overflow-hidden">
                  <img src={gen.image_url} alt="Gallery item" className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] truncate font-bold">{gen.prompt}</p>
                    <button
                      onClick={() => downloadImage(gen.image_url, gen.seed)}
                      className="mt-1 border border-white bg-white text-black text-[9px] font-bold py-0.5 text-center uppercase">
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer info panel */}
        <div className="border-4 border-black bg-white p-4 text-xs font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center">
          <div>
            Quota Usage: <span className="font-bold underline">{quotaLimit === 9999 ? "PRO (Unlimited)" : `${quotaUsed} / ${quotaLimit}`}</span> queries used today.
          </div>
          {quotaLimit !== 9999 && (
            <a href="/apps/hindidiff/billing" className="border-2 border-black bg-black text-white px-3 py-1 font-bold uppercase hover:bg-zinc-800">
              Go Pro
            </a>
          )}
        </div>

      </div>
    </div>
  )
}
