'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * Admin System Status — Per-app status toggles and maintenance mode control.
 */

const APP_LIST = [
  { id: 'kisan-voice-ai', name: 'Kisan Voice AI', emoji: '🌾' },
  { id: 'pinai', name: 'PinAI', emoji: '📍' },
  { id: 'docpatram', name: 'DocPatram', emoji: '📄' },
  { id: 'vaadvivaad', name: 'VaadVivaad', emoji: '⚖️' },
  { id: 'hindidiff', name: 'HindiDiff', emoji: '🎨' },
]

const STATUS_OPTIONS = [
  { value: 'operational', label: 'Operational', color: 'bg-lime-300' },
  { value: 'degraded', label: 'Degraded', color: 'bg-amber-300' },
  { value: 'outage', label: 'Outage', color: 'bg-red-400' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-zinc-300' },
]

interface StatusEntry {
  app_id: string
  status: string
  message: string | null
  updated_at: string | null
}

export default function AdminStatusPage() {
  const supabase = createClient()
  const [statuses, setStatuses] = useState<StatusEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchStatuses()
  }, [])

  const fetchStatuses = async () => {
    const { data } = await supabase
      .from('system_status')
      .select('app_id, status, message, updated_at')

    const statusMap = new Map((data || []).map((s: any) => [s.app_id, s]))

    const merged = APP_LIST.map((app) => ({
      app_id: app.id,
      status: statusMap.get(app.id)?.status || 'operational',
      message: statusMap.get(app.id)?.message || null,
      updated_at: statusMap.get(app.id)?.updated_at || null,
    }))

    setStatuses(merged)
    setLoading(false)
  }

  const updateStatus = async (appId: string, newStatus: string, message: string) => {
    setSaving(appId)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('system_status').upsert({
      app_id: appId,
      status: newStatus,
      message: message || `Status changed to ${newStatus}`,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'app_id' })

    await fetchStatuses()
    setSaving(null)
  }

  const setAllStatus = async (status: string) => {
    const { data: { user } } = await supabase.auth.getUser()

    for (const app of APP_LIST) {
      await supabase.from('system_status').upsert({
        app_id: app.id,
        status,
        message: `Bulk status change to ${status}`,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'app_id' })
    }

    await fetchStatuses()
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-6">System Status</h1>
        <p className="font-bold">Loading status data...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-6">🔧 System Status</h1>

      {/* Bulk Actions */}
      <div className="border-4 border-black bg-white p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="font-black text-sm uppercase mb-3">Bulk Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAllStatus('operational')}
            className="border-2 border-black bg-lime-300 px-4 py-2 font-bold text-xs uppercase
                       shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            ✅ Set All Operational
          </button>
          <button
            onClick={() => setAllStatus('maintenance')}
            className="border-2 border-black bg-zinc-300 px-4 py-2 font-bold text-xs uppercase
                       shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            🔧 Set All Maintenance
          </button>
        </div>
      </div>

      {/* Per-App Status Cards */}
      <div className="space-y-4">
        {APP_LIST.map((app) => {
          const status = statuses.find((s) => s.app_id === app.id)
          const currentStatus = status?.status || 'operational'
          const statusInfo = STATUS_OPTIONS.find((s) => s.value === currentStatus)

          return (
            <div
              key={app.id}
              className="border-4 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{app.emoji}</span>
                  <h3 className="font-black text-lg uppercase">{app.name}</h3>
                </div>
                <span
                  className={`border-2 border-black ${statusInfo?.color} px-3 py-1 font-black text-xs uppercase`}
                >
                  {statusInfo?.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus(app.id, opt.value, '')}
                    disabled={saving === app.id}
                    className={`border-2 border-black px-3 py-1.5 font-bold text-xs uppercase transition-all
                               ${currentStatus === opt.value
                                 ? `${opt.color} shadow-none translate-x-[1px] translate-y-[1px]`
                                 : `bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px]`
                               }
                               ${saving === app.id ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {status?.message && (
                <p className="text-xs font-mono text-zinc-500">
                  Message: {status.message}
                </p>
              )}
              {status?.updated_at && (
                <p className="text-[10px] font-mono text-zinc-400 mt-1">
                  Last updated: {new Date(status.updated_at).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
