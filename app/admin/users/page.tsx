'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import LoadingSkeleton from '../../components/LoadingSkeleton'

/**
 * Admin User Management — Searchable user table with subscription status.
 */

interface UserRow {
  id: string
  full_name: string | null
  phone: string | null
  preferred_language: string
  onboarding_completed: boolean
  created_at: string
  subscriptions: Array<{ app_id: string; plan: string; status: string }>
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const perPage = 20

  const fetchUsers = async (p: number, q: string) => {
    setLoading(true)
    const offset = (p - 1) * perPage

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (q.trim()) {
      query = query.ilike('full_name', `%${q.trim()}%`)
    }

    const { data: profiles, count } = await query

    const userIds = (profiles || []).map((p: any) => p.id)
    let subsMap: Record<string, Array<{ app_id: string; plan: string; status: string }>> = {}

    if (userIds.length > 0) {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('user_id, app_id, plan, status')
        .in('user_id', userIds)

      for (const s of (subs || [])) {
        if (!subsMap[s.user_id]) subsMap[s.user_id] = []
        subsMap[s.user_id].push({ app_id: s.app_id, plan: s.plan, status: s.status })
      }
    }

    const enriched: UserRow[] = (profiles || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      preferred_language: p.preferred_language || 'hi',
      onboarding_completed: p.onboarding_completed || false,
      created_at: p.created_at,
      subscriptions: subsMap[p.id] || [],
    }))

    setUsers(enriched)
    setTotal(count || 0)
    setLoading(false)
  }

  useEffect(() => { fetchUsers(page, search) }, [page])

  const handleSearch = () => {
    setPage(1)
    fetchUsers(1, search)
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-6">👥 User Management</h1>

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name..."
          className="flex-1 border-4 border-black p-2.5 font-bold focus:outline-none"
        />
        <button
          onClick={handleSearch}
          className="border-4 border-black bg-yellow-300 px-6 py-2.5 font-black uppercase
                     shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                     hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          Search
        </button>
      </div>

      {/* Stats bar */}
      <div className="border-2 border-black bg-zinc-50 px-4 py-2 mb-4 flex justify-between items-center">
        <span className="font-bold text-xs uppercase">
          Total: {total} users
        </span>
        <span className="font-mono text-xs text-zinc-500">
          Page {page} of {totalPages || 1}
        </span>
      </div>

      {loading ? (
        <LoadingSkeleton variant="table-row" count={8} />
      ) : (
        <>
          {/* User Table */}
          <div className="border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-4 border-black bg-zinc-100">
                  <th className="p-3 font-black text-xs uppercase border-r-2 border-black">Name</th>
                  <th className="p-3 font-black text-xs uppercase border-r-2 border-black">Phone</th>
                  <th className="p-3 font-black text-xs uppercase border-r-2 border-black">Lang</th>
                  <th className="p-3 font-black text-xs uppercase border-r-2 border-black">Subscriptions</th>
                  <th className="p-3 font-black text-xs uppercase border-r-2 border-black">Onboarded</th>
                  <th className="p-3 font-black text-xs uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="border-b-2 border-black hover:bg-zinc-50">
                    <td className="p-3 border-r-2 border-black font-bold">
                      {user.full_name || '—'}
                    </td>
                    <td className="p-3 border-r-2 border-black font-mono text-xs">
                      {user.phone || '—'}
                    </td>
                    <td className="p-3 border-r-2 border-black font-bold text-xs uppercase">
                      {user.preferred_language}
                    </td>
                    <td className="p-3 border-r-2 border-black">
                      <div className="flex flex-wrap gap-1">
                        {user.subscriptions.length === 0 ? (
                          <span className="text-xs text-zinc-400">Free only</span>
                        ) : (
                          user.subscriptions.map((s, i) => (
                            <span
                              key={i}
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border border-black
                                ${s.plan === 'paid' && s.status === 'active'
                                  ? 'bg-lime-300'
                                  : s.status === 'cancelled'
                                    ? 'bg-red-200'
                                    : 'bg-zinc-100'
                                }`}
                            >
                              {s.app_id}:{s.plan}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-r-2 border-black text-center">
                      {user.onboarding_completed ? '✅' : '—'}
                    </td>
                    <td className="p-3 font-mono text-xs text-zinc-500">
                      {new Date(user.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="border-2 border-black px-3 py-1 font-bold text-sm disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="border-2 border-black bg-black text-yellow-300 px-4 py-1 font-black text-sm">
                {page}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="border-2 border-black px-3 py-1 font-bold text-sm disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
