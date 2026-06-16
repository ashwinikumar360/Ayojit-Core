'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const APPS = [
  { id: 'kisan-voice-ai', name: 'Kisan Voice AI', emoji: '🌾', color: 'bg-orange-300', limit: 'Unlimited' },
  { id: 'pinai', name: 'PinAI', emoji: '📍', color: 'bg-yellow-300', limit: '5 queries/day' },
  { id: 'docpatram', name: 'DocPatram', emoji: '📄', color: 'bg-lime-300', limit: '10 docs/day' },
  { id: 'vaadvivaad', name: 'VaadVivaad', emoji: '⚖️', color: 'bg-red-300', limit: '1 free dispute' },
  { id: 'hindidiff', name: 'HindiDiff', emoji: '🎨', color: 'bg-amber-200', limit: '10 images/day' },
]

export default function Dashboard() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [subs, setSubs] = useState<any[]>([])
  const [usage, setUsage] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        // Fetch User Subscriptions
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
        setSubs(subData || [])

        // Fetch User Daily Quota Usage
        const { data: usageData } = await supabase
          .from('usage_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('usage_date', new Date().toISOString().slice(0, 10))
        setUsage(usageData || [])
      }
      setLoading(false)
    })()
  }, [])

  const planFor = (appId: string) => subs.find(s => s.app_id === appId)?.plan || 'free'
  const usageFor = (appId: string) => usage.find(u => u.app_id === appId)?.count || 0

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans">
        <div className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xl font-black">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Block */}
        <div className="border-4 border-black bg-yellow-300 p-6 mb-8
                        shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-tight">
            Welcome, {user?.email?.split('@')[0] || 'Citizen'} 👋
          </h1>
          <p className="font-bold text-lg mt-1">
            Ayojit Intelligence — AIKosh App Suite
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {APPS.map(app => {
            const plan = planFor(app.id)
            const todayUsage = usageFor(app.id)

            return (
              <div key={app.id}
                className={`border-4 border-black ${app.color} p-5
                           shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                           hover:translate-x-[2px] hover:translate-y-[2px]
                           hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all`}>
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-4xl filter drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      {app.emoji}
                    </span>
                    <h2 className="text-2xl font-black mt-2 uppercase">{app.name}</h2>
                    <p className="text-sm font-bold mt-1">
                      Tier: <span className="underline">{plan.toUpperCase()}</span>
                    </p>
                    <p className="text-xs font-mono mt-1">
                      Today's Usage: {todayUsage} / Limit: {app.limit}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <a href={`/apps/${app.id}`}
                       className="border-2 border-black bg-white px-4 py-2 font-black text-sm uppercase
                                  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                                  hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                      Open →
                    </a>
                    {plan === 'free' && app.id !== 'kisan-voice-ai' && (
                      <a href={`/apps/${app.id}/billing`}
                         className="border-2 border-black bg-black text-white px-4 py-2 font-black text-sm uppercase
                                    shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                                    hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                        Upgrade
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Asset Compliance Registry */}
        <div className="border-4 border-black bg-white p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-black uppercase mb-4 border-b-2 border-black pb-1 flex justify-between items-center">
            <span>🛡️ Open Asset Compliance Registry</span>
            <span className="text-xs font-mono border-2 border-black bg-emerald-200 px-2 py-0.5">Permissive Only</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-4 border-black bg-zinc-100 text-xs font-black uppercase">
                  <th className="p-3 border-r-2 border-black">Asset ID</th>
                  <th className="p-3 border-r-2 border-black">Type</th>
                  <th className="p-3 border-r-2 border-black">License</th>
                  <th className="p-3 border-r-2 border-black">Version Hash / Tag</th>
                  <th className="p-3">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono">
                <tr className="border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">sentence-transformers/all-MiniLM-L6-v2</td>
                  <td className="p-3 border-r-2 border-black font-semibold">Embeddings</td>
                  <td className="p-3 border-r-2 border-black font-bold">Apache-2.0</td>
                  <td className="p-3 border-r-2 border-black break-all">1110a243fdf4706b3f48f1d95db1a4f5529b4d41</td>
                  <td className="p-3"><span className="border-2 border-black bg-emerald-200 px-2 py-0.5 font-bold uppercase">Approved</span></td>
                </tr>
                <tr className="border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">ai4bharat/indic-parler-tts</td>
                  <td className="p-3 border-r-2 border-black font-semibold">Speech Synth (TTS)</td>
                  <td className="p-3 border-r-2 border-black font-bold">Apache-2.0</td>
                  <td className="p-3 border-r-2 border-black">main</td>
                  <td className="p-3"><span className="border-2 border-black bg-emerald-200 px-2 py-0.5 font-bold uppercase">Approved</span></td>
                </tr>
                <tr className="border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">IndicTrans2</td>
                  <td className="p-3 border-r-2 border-black font-semibold">Translation</td>
                  <td className="p-3 border-r-2 border-black font-bold">MIT</td>
                  <td className="p-3 border-r-2 border-black">main</td>
                  <td className="p-3"><span className="border-2 border-black bg-emerald-200 px-2 py-0.5 font-bold uppercase">Approved</span></td>
                </tr>
                <tr className="border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">data.gov.in/pincode</td>
                  <td className="p-3 border-r-2 border-black font-semibold">Census Dataset</td>
                  <td className="p-3 border-r-2 border-black font-bold">GODL-India</td>
                  <td className="p-3 border-r-2 border-black">2026-06-snapshot</td>
                  <td className="p-3"><span className="border-2 border-black bg-blue-200 px-2 py-0.5 font-bold uppercase">Attribution Req</span></td>
                </tr>
                <tr className="border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">data.gov.in/kcc</td>
                  <td className="p-3 border-r-2 border-black font-semibold">Kisan Call Centre</td>
                  <td className="p-3 border-r-2 border-black font-bold">GODL-India</td>
                  <td className="p-3 border-r-2 border-black">2026-06-snapshot</td>
                  <td className="p-3"><span className="border-2 border-black bg-blue-200 px-2 py-0.5 font-bold uppercase">Attribution Req</span></td>
                </tr>
                <tr className="border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">data.gov.in/public_templates</td>
                  <td className="p-3 border-r-2 border-black font-semibold">Form Templates</td>
                  <td className="p-3 border-r-2 border-black font-bold">GODL-India</td>
                  <td className="p-3 border-r-2 border-black">2026-06-snapshot</td>
                  <td className="p-3"><span className="border-2 border-black bg-blue-200 px-2 py-0.5 font-bold uppercase">Attribution Req</span></td>
                </tr>
                <tr className="border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">cup-punjab/Baaz-v1</td>
                  <td className="p-3 border-r-2 border-black font-semibold">Image Gen VLM</td>
                  <td className="p-3 border-r-2 border-black font-bold text-red-500">Custom (NC)</td>
                  <td className="p-3 border-r-2 border-black">main</td>
                  <td className="p-3"><span className="border-2 border-black bg-yellow-200 px-2 py-0.5 font-bold uppercase">Swapped to Fallback</span></td>
                </tr>
                <tr>
                  <td className="p-3 border-r-2 border-black font-bold text-zinc-500">└─ stabilityai/stable-diffusion-v1-5</td>
                  <td className="p-3 border-r-2 border-black font-semibold text-zinc-500">Image Fallback</td>
                  <td className="p-3 border-r-2 border-black font-bold text-zinc-500">CreativeML-OpenRAIL-M</td>
                  <td className="p-3 border-r-2 border-black text-zinc-500">main</td>
                  <td className="p-3"><span className="border-2 border-black bg-emerald-200 px-2 py-0.5 font-bold uppercase">Approved</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Legal Disclaimer Footer */}
        <div className="border-4 border-black bg-white p-5 text-xs font-mono
                        shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          This application uses publicly available AI models/datasets sourced via{' '}
          <a href="https://aikosh.indiaai.gov.in" className="underline font-bold"
             target="_blank" rel="noopener noreferrer">AIKosh</a>
          {' '}(aikosh.indiaai.gov.in), maintained by IndiaAI under the Ministry of Electronics
          & Information Technology, Government of India.
          Ayojit Intelligence is an independent product studio and is not affiliated with, endorsed
          by, or sponsored by AIKosh, IndiaAI, or the Government of India.
        </div>
        
      </div>
    </div>
  )
}
