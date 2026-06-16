'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import LoadingSkeleton from '../components/LoadingSkeleton'

/**
 * Admin Revenue Dashboard — Overview of MRR, subscriptions, usage trends.
 */

interface RevenueData {
  totalUsers: number
  activeSubscriptions: number
  mrrInr: number
  requestsToday: number
  perAppSubs: Record<string, number>
  recentSignups: Array<{ full_name: string; created_at: string }>
}

const PRICE_MAP: Record<string, number> = {
  pinai: 299,
  docpatram: 999,
  hindidiff: 99,
}

const APP_META: Record<string, { name: string; emoji: string; color: string }> = {
  'kisan-voice-ai': { name: 'Kisan Voice AI', emoji: '🌾', color: 'bg-orange-300' },
  pinai: { name: 'PinAI', emoji: '📍', color: 'bg-yellow-300' },
  docpatram: { name: 'DocPatram', emoji: '📄', color: 'bg-lime-300' },
  vaadvivaad: { name: 'VaadVivaad', emoji: '⚖️', color: 'bg-red-300' },
  hindidiff: { name: 'HindiDiff', emoji: '🎨', color: 'bg-amber-200' },
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })

      // Active paid subscriptions
      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('app_id, plan, status')
        .eq('plan', 'paid')
        .eq('status', 'active')

      const perAppSubs: Record<string, number> = {}
      let mrr = 0
      for (const sub of (activeSubs || [])) {
        perAppSubs[sub.app_id] = (perAppSubs[sub.app_id] || 0) + 1
        mrr += PRICE_MAP[sub.app_id] || 0
      }

      // Today's requests
      const today = new Date().toISOString().slice(0, 10)
      const { data: usageData } = await supabase
        .from('usage_logs')
        .select('count')
        .eq('usage_date', today)

      const requestsToday = (usageData || []).reduce((sum, u) => sum + (u.count || 0), 0)

      // Recent signups (last 10)
      const { data: signups } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      setData({
        totalUsers: totalUsers || 0,
        activeSubscriptions: (activeSubs || []).length,
        mrrInr: mrr,
        requestsToday,
        perAppSubs,
        recentSignups: signups || [],
      })
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-6">Revenue Dashboard</h1>
        <LoadingSkeleton variant="stat-card" count={4} />
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-6">📊 Revenue Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Monthly Revenue (MRR)" value={`₹${data.mrrInr.toLocaleString()}`} sub="From paid subscriptions" color="bg-lime-300" />
        <StatCard label="Active Subscriptions" value={data.activeSubscriptions.toString()} sub="Paid users across all apps" color="bg-yellow-300" />
        <StatCard label="Total Users" value={data.totalUsers.toString()} sub="Registered profiles" color="bg-amber-200" />
        <StatCard label="Requests Today" value={data.requestsToday.toLocaleString()} sub="API calls across all apps" color="bg-orange-300" />
      </div>

      {/* Per-App Subscription Breakdown */}
      <div className="border-4 border-black bg-white p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2">
          Subscriptions by App
        </h2>
        <div className="space-y-3">
          {Object.entries(APP_META).map(([appId, meta]) => {
            const count = data.perAppSubs[appId] || 0
            const maxCount = Math.max(1, ...Object.values(data.perAppSubs))
            const barWidth = Math.max(2, (count / maxCount) * 100)

            return (
              <div key={appId} className="flex items-center gap-3">
                <span className="w-8 text-center text-lg">{meta.emoji}</span>
                <span className="w-32 font-black text-xs uppercase truncate">{meta.name}</span>
                <div className="flex-1 border-2 border-black h-6 bg-zinc-100 relative">
                  <div
                    className={`h-full ${meta.color} border-r-2 border-black transition-all`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="w-12 font-black text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Signups */}
      <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2">
          Recent Signups
        </h2>
        {data.recentSignups.length === 0 ? (
          <p className="text-sm font-bold text-zinc-400">No signups yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recentSignups.map((signup, i) => (
              <div key={i} className="flex justify-between items-center border-b border-zinc-200 pb-2">
                <span className="font-bold text-sm">{signup.full_name || 'Anonymous'}</span>
                <span className="font-mono text-xs text-zinc-400">
                  {new Date(signup.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className={`border-4 border-black ${color} p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
      <p className="text-[10px] font-black uppercase text-zinc-700 tracking-wider">{label}</p>
      <p className="text-3xl font-black mt-1">{value}</p>
      <p className="text-[10px] font-mono text-zinc-500 mt-1">{sub}</p>
    </div>
  )
}
