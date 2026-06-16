'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const APPS = [
  { id: 'kisan-voice-ai', name: 'Kisan Voice AI', emoji: '🌾', color: 'bg-orange-300', unitCost: 15 },
  { id: 'pinai', name: 'PinAI', emoji: '📍', color: 'bg-yellow-300', unitCost: 30 },
  { id: 'docpatram', name: 'DocPatram', emoji: '📄', color: 'bg-lime-300', unitCost: 50 },
  { id: 'vaadvivaad', name: 'VaadVivaad', emoji: '⚖️', color: 'bg-red-300', unitCost: 250 },
  { id: 'hindidiff', name: 'HindiDiff', emoji: '🎨', color: 'bg-amber-200', unitCost: 20 },
]

export default function AnalyticsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        // Fetch last 30 days of usage
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const dateStr = thirtyDaysAgo.toISOString().slice(0, 10)

        const { data } = await supabase
          .from('usage_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('usage_date', dateStr)
          .order('usage_date', { ascending: true })

        setLogs(data || [])
      }
      setLoading(false)
    })()
  }, [])

  // Calculate stats
  const appStats = APPS.map(app => {
    const appLogs = logs.filter(l => l.app_id === app.id)
    const totalRequests = appLogs.reduce((acc, curr) => acc + curr.count, 0)
    const totalSavings = totalRequests * app.unitCost

    return {
      ...app,
      totalRequests,
      totalSavings,
    }
  })

  const totalRequestsAll = appStats.reduce((acc, curr) => acc + curr.totalRequests, 0)
  const totalSavingsAll = appStats.reduce((acc, curr) => acc + curr.totalSavings, 0)

  // Group by date for a mini bar chart
  const dateMap: Record<string, number> = {}
  logs.forEach(log => {
    dateMap[log.usage_date] = (dateMap[log.usage_date] || 0) + log.count
  })

  const sortedDates = Object.keys(dateMap).sort()
  const maxRequestsInADay = Math.max(...Object.values(dateMap), 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans">
        <div className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-pulse">
          <p className="text-xl font-black uppercase">Analyzing your activity...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Header */}
        <header className="flex justify-between items-center mb-8">
          <a
            href="/dashboard"
            className="border-3 border-black bg-white px-4 py-2 font-black text-sm uppercase
                       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                       hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            ← Back to Dashboard
          </a>
          <span className="font-mono text-xs border-2 border-black bg-black text-yellow-300 px-3 py-1 font-bold">
            Analytics — Last 30 Days
          </span>
        </header>

        {/* Hero Headline */}
        <div className="border-4 border-black bg-yellow-300 p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-tight">📈 Usage & Impact Analytics</h1>
          <p className="font-bold text-lg mt-1">
            See how your digital operations compare and calculate your economic benefit.
          </p>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-xs font-mono text-zinc-500 uppercase font-bold">Total Requests Executed</span>
            <p className="text-5xl font-black mt-2">{totalRequestsAll}</p>
            <p className="text-sm font-bold text-zinc-700 mt-2">Across all 5 civic-AI applications</p>
          </div>
          <div className="border-4 border-black bg-lime-300 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-xs font-mono text-black uppercase font-bold">Estimated Cost Savings</span>
            <p className="text-5xl font-black mt-2">₹{totalSavingsAll}</p>
            <p className="text-sm font-bold text-black mt-2">Calculated vs standard commercial service fees</p>
          </div>
        </div>

        {/* Activity Bar Chart (CSS-based) */}
        <div className="border-4 border-black bg-white p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-black uppercase mb-6 border-b-2 border-black pb-1">📅 Daily Request Activity</h2>
          {sortedDates.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-4xl block mb-2">📊</span>
              <p className="font-bold text-zinc-500">No requests recorded in the last 30 days yet.</p>
            </div>
          ) : (
            <div>
              <div className="h-48 flex items-end gap-2 px-2 border-b-4 border-black">
                {sortedDates.map(date => {
                  const count = dateMap[date]
                  const percentage = (count / maxRequestsInADay) * 100
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-black text-white text-[10px] font-mono px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(252,211,77,1)] whitespace-nowrap">
                        {date}: {count} reqs
                      </div>
                      <div
                        className="w-full bg-amber-400 border-2 border-black border-b-0 hover:bg-amber-300 transition-colors"
                        style={{ height: `${percentage}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between font-mono text-[10px] text-zinc-500 mt-2">
                <span>{sortedDates[0]}</span>
                <span>{sortedDates[sortedDates.length - 1]}</span>
              </div>
            </div>
          )}
        </div>

        {/* Per-App Breakdown */}
        <div className="border-4 border-black bg-white p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-black uppercase mb-4 border-b-2 border-black pb-1">📦 Application Breakdown</h2>
          <div className="space-y-4">
            {appStats.map(app => {
              const share = totalRequestsAll > 0 ? (app.totalRequests / totalRequestsAll) * 100 : 0
              return (
                <div key={app.id} className="border-3 border-black p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{app.emoji}</span>
                    <div>
                      <h3 className="text-lg font-black uppercase">{app.name}</h3>
                      <p className="text-xs font-bold text-zinc-500 font-mono">Unit Rate Reference: ₹{app.unitCost}/task</p>
                    </div>
                  </div>
                  <div className="w-full md:w-48 bg-zinc-200 border-2 border-black h-6 overflow-hidden">
                    <div className={`${app.color} h-full border-r-2 border-black`} style={{ width: `${share}%` }} />
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm">{app.totalRequests} Requests</p>
                    <p className="font-bold text-xs text-lime-600">Saved: ₹{app.totalSavings}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AIKosh Attribution */}
        <div className="border-4 border-black bg-white p-5 text-xs font-mono shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
