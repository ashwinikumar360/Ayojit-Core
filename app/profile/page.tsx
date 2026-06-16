'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * Profile Settings Page — User profile editing with language and phone fields.
 */

export default function ProfilePage() {
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('hi')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, preferred_language')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        setFullName(profile.full_name || '')
        setPhone(profile.phone || '')
        setLanguage(profile.preferred_language || 'hi')
      }
      setLoading(false)
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      full_name: fullName,
      phone: phone,
      preferred_language: language,
    }).eq('id', user.id)

    localStorage.setItem('ayojit_locale', language)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 font-sans flex items-center justify-center">
        <p className="font-black text-xl">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black">
      <header className="border-b-4 border-black bg-white px-6 py-4">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <a href="/dashboard" className="font-black text-lg uppercase tracking-tight">← Dashboard</a>
          <span className="font-bold text-xs uppercase text-zinc-500">Profile</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-black uppercase tracking-tight mb-6">👤 Profile Settings</h1>

        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
          {/* Full Name */}
          <div>
            <label className="block font-black text-xs uppercase mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border-3 border-black p-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              placeholder="Your full name"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block font-black text-xs uppercase mb-2">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border-3 border-black p-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          {/* Language */}
          <div>
            <label className="block font-black text-xs uppercase mb-2">Preferred Language</label>
            <div className="flex gap-3">
              {[
                { code: 'en', label: '🇬🇧 English' },
                { code: 'hi', label: '🇮🇳 हिंदी' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex-1 border-3 border-black p-3 font-black text-sm uppercase transition-all
                    ${language === lang.code
                      ? 'bg-yellow-300 shadow-none translate-x-[1px] translate-y-[1px]'
                      : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full border-4 border-black py-3 font-black uppercase text-sm
                       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px]
                       hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all
                       ${saved ? 'bg-lime-300' : 'bg-yellow-300'}
                       ${saving ? 'opacity-50 cursor-wait' : ''}`}
          >
            {saved ? '✅ Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>
    </div>
  )
}
