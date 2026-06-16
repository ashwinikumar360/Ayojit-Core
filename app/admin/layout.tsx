'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Admin layout with sidebar navigation and auth guard.
 * Checks admin_users table to verify admin status.
 */

const ADMIN_NAV = [
  { href: '/admin', label: 'Revenue Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'User Management', icon: '👥' },
  { href: '/admin/status', label: 'System Status', icon: '🔧' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/dashboard')
        return
      }

      setAdminEmail(user.email || '')

      const { data } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data) {
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
    })()
  }, [])

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-sans">
        <div className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xl font-black">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black flex">
      {/* Sidebar */}
      <aside className="w-64 border-r-4 border-black bg-black text-white flex-shrink-0 flex flex-col">
        <div className="p-4 border-b-2 border-zinc-700">
          <h1 className="font-black text-yellow-300 uppercase text-sm tracking-wider">
            🔒 Admin Panel
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono mt-1 truncate">{adminEmail}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {ADMIN_NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2.5 font-bold text-sm uppercase hover:bg-zinc-800 transition-colors"
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="p-3 border-t-2 border-zinc-700">
          <a
            href="/dashboard"
            className="block px-3 py-2 font-bold text-xs uppercase text-zinc-400 hover:text-white"
          >
            ← Back to Dashboard
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
