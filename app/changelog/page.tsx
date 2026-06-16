'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * Public Changelog Page — Lists published changelog entries at /changelog.
 */

interface ChangelogEntry {
  id: string
  version: string
  title: string
  description: string
  category: string
  published_at: string
}

const CATEGORY_STYLES: Record<string, { bg: string; label: string }> = {
  feature: { bg: 'bg-lime-300', label: 'Feature' },
  fix: { bg: 'bg-red-300', label: 'Fix' },
  improvement: { bg: 'bg-amber-200', label: 'Improvement' },
  breaking: { bg: 'bg-red-400', label: 'Breaking' },
}

export default function ChangelogPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false })

      setEntries(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black">
      {/* Header */}
      <header className="border-b-4 border-black bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <a href="/" className="font-black text-lg uppercase tracking-tight">
            🏛️ Ayojit Intelligence
          </a>
          <span className="font-bold text-xs uppercase text-zinc-500">Changelog</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-black uppercase tracking-tight mb-8 border-b-4 border-black pb-2">
          📋 Changelog
        </h1>

        {loading ? (
          <p className="font-bold text-center py-12">Loading changelog...</p>
        ) : entries.length === 0 ? (
          <div className="border-4 border-black bg-white p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-lg font-black">No changelog entries yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => {
              const catStyle = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.improvement

              return (
                <article
                  key={entry.id}
                  className="border-4 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="border-2 border-black bg-black text-yellow-300 px-2 py-0.5 font-black text-xs">
                          v{entry.version}
                        </span>
                        <span className={`border-2 border-black ${catStyle.bg} px-2 py-0.5 font-black text-xs uppercase`}>
                          {catStyle.label}
                        </span>
                      </div>
                      <h2 className="text-xl font-black">{entry.title}</h2>
                    </div>
                    <span className="font-mono text-xs text-zinc-400 flex-shrink-0 ml-4">
                      {entry.published_at
                        ? new Date(entry.published_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })
                        : '—'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-600 leading-relaxed">
                    {entry.description}
                  </p>
                </article>
              )
            })}
          </div>
        )}

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
