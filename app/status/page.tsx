'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * Public Status Page — Shows operational status for all 5 apps.
 * Accessible without authentication at /status.
 */

const APP_LIST = [
  { id: 'kisan-voice-ai', name: 'Kisan Voice AI', emoji: '🌾' },
  { id: 'pinai', name: 'PinAI', emoji: '📍' },
  { id: 'docpatram', name: 'DocPatram', emoji: '📄' },
  { id: 'vaadvivaad', name: 'VaadVivaad', emoji: '⚖️' },
  { id: 'hindidiff', name: 'HindiDiff', emoji: '🎨' },
]

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  operational: { label: 'Operational', color: 'bg-lime-300', icon: '✅' },
  degraded: { label: 'Degraded', color: 'bg-amber-300', icon: '⚠️' },
  outage: { label: 'Outage', color: 'bg-red-400', icon: '❌' },
  maintenance: { label: 'Maintenance', color: 'bg-zinc-300', icon: '🔧' },
}

export default function StatusPage() {
  const supabase = createClient()
  const [statuses, setStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_status')
        .select('app_id, status, message, updated_at')

      const statusMap = new Map((data || []).map((s: any) => [s.app_id, s]))

      const merged = APP_LIST.map((app) => ({
        ...app,
        status: statusMap.get(app.id)?.status || 'operational',
        message: statusMap.get(app.id)?.message || null,
        updated_at: statusMap.get(app.id)?.updated_at || null,
      }))

      setStatuses(merged)
      setLoading(false)
    })()
  }, [])

  const allOperational = statuses.every((s) => s.status === 'operational')

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black">
      {/* Header */}
      <header className="border-b-4 border-black bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <a href="/" className="font-black text-lg uppercase tracking-tight">
            🏛️ Ayojit Intelligence
          </a>
          <span className="font-bold text-xs uppercase text-zinc-500">System Status</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Overall Status Banner */}
        <div className={`border-4 border-black p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                        ${allOperational ? 'bg-lime-300' : 'bg-amber-300'}`}>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {allOperational ? '✅ All Systems Operational' : '⚠️ Some Systems Affected'}
          </h1>
          <p className="font-bold text-sm mt-2 text-zinc-700">
            Last checked: {new Date().toLocaleString('en-IN')}
          </p>
        </div>

        {/* Per-app Status */}
        <div className="space-y-3">
          {loading ? (
            <p className="font-bold text-center py-12">Loading status data...</p>
          ) : (
            statuses.map((app) => {
              const meta = STATUS_META[app.status] || STATUS_META.operational

              return (
                <div
                  key={app.id}
                  className="border-4 border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                             flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{app.emoji}</span>
                    <div>
                      <h3 className="font-black text-sm uppercase">{app.name}</h3>
                      {app.message && app.status !== 'operational' && (
                        <p className="text-xs text-zinc-500 mt-0.5">{app.message}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`border-2 border-black ${meta.color} px-3 py-1 font-black text-xs uppercase`}
                  >
                    {meta.icon} {meta.label}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 border-4 border-black bg-white p-4 text-xs font-mono text-zinc-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          This application uses publicly available AI models/datasets sourced via{' '}
          <a href="https://aikosh.indiaai.gov.in" className="underline text-black font-bold">AIKosh</a>{' '}
          (aikosh.indiaai.gov.in), maintained by IndiaAI under MeitY, Government of India.
          Ayojit Intelligence is not affiliated with or endorsed by AIKosh or the Government of India.
        </div>
      </main>
    </div>
  )
}
