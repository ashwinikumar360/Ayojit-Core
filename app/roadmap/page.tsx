'use client'

import { useState, useEffect } from 'react'

interface RoadmapItem {
  id: string
  title: string
  description: string
  category: string
  votes: number
  status: 'planned' | 'in-progress' | 'shipped'
}

const INITIAL_ITEMS: RoadmapItem[] = [
  {
    id: 'road-1',
    title: 'Offline-ready mobile client (PWA)',
    description: 'Enable farmers and field officers to collect voice queries and data offline, syncing when connectivity resumes.',
    category: 'Infra',
    votes: 42,
    status: 'planned',
  },
  {
    id: 'road-2',
    title: 'Support for regional dialects in Kisan Voice AI',
    description: 'Fine-tune Bhashini speech-to-text models on regional dialect variations for better accuracy in rural districts.',
    category: 'AI Model',
    votes: 89,
    status: 'in-progress',
  },
  {
    id: 'road-3',
    title: 'Dodo Payments Subscription integration',
    description: 'Roll out flexible payment plans to handle higher usage quotas for government agencies and enterprise clients.',
    category: 'Billing',
    votes: 112,
    status: 'shipped',
  },
  {
    id: 'road-4',
    title: 'VaadVivaad arbitration draft exports to Word (.docx)',
    description: 'Export structured dispute summaries directly into legal template format for court filings.',
    category: 'Feature',
    votes: 27,
    status: 'planned',
  },
  {
    id: 'road-5',
    title: 'Public API v1 with API Keys',
    description: 'Provide programmatic access to PinAI, DocPatram, and HindiDiff to enable custom application workflows.',
    category: 'Integrations',
    votes: 73,
    status: 'shipped',
  },
  {
    id: 'road-6',
    title: 'Multi-document alignment analyzer',
    description: 'Enable uploading multiple agricultural land maps or commercial rental agreements to verify matching boundaries.',
    category: 'Feature',
    votes: 56,
    status: 'in-progress',
  },
]

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>(INITIAL_ITEMS)
  const [votedIds, setVotedIds] = useState<string[]>([])

  useEffect(() => {
    const savedVotes = localStorage.getItem('ayojit_roadmap_votes')
    if (savedVotes) {
      setVotedIds(JSON.parse(savedVotes))
    }
  }, [])

  const handleVote = (id: string) => {
    if (votedIds.includes(id)) {
      // Unvote
      setVotedIds(prev => {
        const next = prev.filter(v => v !== id)
        localStorage.setItem('ayojit_roadmap_votes', JSON.stringify(next))
        return next
      })
      setItems(prev => prev.map(item => item.id === id ? { ...item, votes: item.votes - 1 } : item))
    } else {
      // Vote
      setVotedIds(prev => {
        const next = [...prev, id]
        localStorage.setItem('ayojit_roadmap_votes', JSON.stringify(next))
        return next
      })
      setItems(prev => prev.map(item => item.id === id ? { ...item, votes: item.votes + 1 } : item))
    }
  }

  const columns: { status: RoadmapItem['status']; label: string; color: string }[] = [
    { status: 'planned', label: '📅 Planned / In Backlog', color: 'bg-orange-100' },
    { status: 'in-progress', label: '⚡ In Progress / Building', color: 'bg-yellow-100' },
    { status: 'shipped', label: '✅ Shipped / Live', color: 'bg-lime-100' },
  ]

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Header */}
        <header className="flex justify-between items-center mb-8">
          <a
            href="/"
            className="border-3 border-black bg-white px-4 py-2 font-black text-sm uppercase
                       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                       hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            ← Back Home
          </a>
          <span className="font-mono text-xs border-2 border-black bg-black text-yellow-300 px-3 py-1 font-bold">
            Public Roadmap
          </span>
        </header>

        {/* Hero Headline */}
        <div className="border-4 border-black bg-lime-300 p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-tight">🗺️ Product Roadmap</h1>
          <p className="font-bold text-lg mt-1">
            Upvote features you want prioritized or track what we have shipped recently.
          </p>
        </div>

        {/* Three Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {columns.map(col => {
            const colItems = items.filter(item => item.status === col.status)
            return (
              <div key={col.status} className={`border-4 border-black ${col.color} p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
                <h2 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-1">
                  {col.label}
                </h2>
                <div className="space-y-4">
                  {colItems.length === 0 ? (
                    <p className="font-medium text-xs text-zinc-500 italic py-4">No items listed in this stage.</p>
                  ) : (
                    colItems.map(item => {
                      const isVoted = votedIds.includes(item.id)
                      return (
                        <div key={item.id} className="border-3 border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <span className="inline-block border-2 border-black bg-zinc-100 text-[10px] font-mono px-2 py-0.5 mb-2 font-bold uppercase">
                            {item.category}
                          </span>
                          <h3 className="font-black text-base uppercase leading-tight mb-2">{item.title}</h3>
                          <p className="text-xs font-bold text-zinc-600 mb-4">{item.description}</p>

                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => handleVote(item.id)}
                              className={`border-2 border-black px-3 py-1.5 font-black text-xs uppercase transition-all flex items-center gap-1.5
                                ${isVoted
                                  ? 'bg-yellow-300 shadow-none translate-x-[1px] translate-y-[1px]'
                                  : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                }`}
                            >
                              <span>▲</span> {isVoted ? 'Upvoted' : 'Upvote'}
                            </button>
                            <span className="font-mono text-xs font-black">{item.votes} Votes</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
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
