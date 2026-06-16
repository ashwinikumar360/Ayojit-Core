'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Onboarding Wizard — 4-step setup flow for new users.
 *
 * Step 1: Welcome
 * Step 2: Language preference (English / Hindi)
 * Step 3: Select apps of interest
 * Step 4: Completion + dashboard redirect
 */

const APPS = [
  { id: 'kisan-voice-ai', name: 'Kisan Voice AI', emoji: '🌾', desc: 'Voice-based agricultural Q&A' },
  { id: 'pinai', name: 'PinAI', emoji: '📍', desc: 'Pincode business intelligence' },
  { id: 'docpatram', name: 'DocPatram', emoji: '📄', desc: 'AI document generation' },
  { id: 'vaadvivaad', name: 'VaadVivaad', emoji: '⚖️', desc: 'Dispute mediation' },
  { id: 'hindidiff', name: 'HindiDiff', emoji: '🎨', desc: 'Hindi text-to-image' },
]

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if already completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      // Resume from saved progress
      const { data: progress } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (progress) {
        setStep(progress.step_completed || 0)
        setSelectedApps(progress.selected_apps || [])
      }
    })()
  }, [])

  const saveProgress = async (nextStep: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('onboarding_progress').upsert({
      user_id: user.id,
      step_completed: nextStep,
      selected_apps: selectedApps,
      completed_at: nextStep >= 3 ? new Date().toISOString() : null,
    }, { onConflict: 'user_id' })
  }

  const completeOnboarding = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Save language preference
    await supabase.from('profiles').update({
      preferred_language: language,
      onboarding_completed: true,
    }).eq('id', user.id)

    // Mark onboarding complete
    await saveProgress(4)
    localStorage.setItem('ayojit_locale', language)

    router.push('/dashboard')
  }

  const nextStep = () => {
    const next = step + 1
    setStep(next)
    saveProgress(next)
  }

  const prevStep = () => {
    setStep(Math.max(0, step - 1))
  }

  const toggleApp = (appId: string) => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 border-2 border-black ${
                i <= step ? 'bg-yellow-300' : 'bg-white'
              }`}
            />
          ))}
        </div>

        {/* Step card */}
        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div>
              <div className="bg-yellow-300 border-b-4 border-black p-6">
                <h1 className="text-3xl font-black uppercase">Welcome to Ayojit 👋</h1>
                <p className="font-bold text-sm mt-2">
                  Let&apos;s set up your account in under a minute.
                </p>
              </div>
              <div className="p-6">
                <p className="text-sm font-medium text-zinc-600 leading-relaxed mb-6">
                  Ayojit Intelligence provides five free AI tools for Indian citizens, farmers, and MSMEs.
                  All powered by open models and public datasets from AIKosh (Government of India).
                </p>
                <button onClick={nextStep}
                        className="w-full border-4 border-black bg-black text-yellow-300 py-3 font-black uppercase text-lg
                                   shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]
                                   hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                  Let&apos;s Go →
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Language */}
          {step === 1 && (
            <div>
              <div className="bg-lime-300 border-b-4 border-black p-6">
                <h1 className="text-2xl font-black uppercase">Choose your Language</h1>
                <p className="font-bold text-sm mt-1">Pick your preferred interface language.</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
                  { code: 'hi' as const, label: 'हिंदी (Hindi)', flag: '🇮🇳' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`w-full border-4 border-black p-4 font-black text-left text-lg uppercase
                               transition-all ${
                                 language === lang.code
                                   ? 'bg-yellow-300 shadow-none translate-x-[2px] translate-y-[2px]'
                                   : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-50'
                               }`}
                  >
                    {lang.flag} {lang.label}
                  </button>
                ))}

                <div className="flex gap-3 mt-6">
                  <button onClick={prevStep}
                          className="flex-1 border-3 border-black bg-white py-2.5 font-black uppercase text-sm
                                     shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    ← Back
                  </button>
                  <button onClick={nextStep}
                          className="flex-1 border-3 border-black bg-black text-yellow-300 py-2.5 font-black uppercase text-sm
                                     shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select apps */}
          {step === 2 && (
            <div>
              <div className="bg-amber-200 border-b-4 border-black p-6">
                <h1 className="text-2xl font-black uppercase">Select Your Apps</h1>
                <p className="font-bold text-sm mt-1">Which apps interest you the most?</p>
              </div>
              <div className="p-6 space-y-2">
                {APPS.map((app) => {
                  const selected = selectedApps.includes(app.id)
                  return (
                    <button
                      key={app.id}
                      onClick={() => toggleApp(app.id)}
                      className={`w-full border-3 border-black p-3 text-left transition-all flex items-center gap-3
                                 ${selected
                                   ? 'bg-yellow-300 shadow-none translate-x-[1px] translate-y-[1px]'
                                   : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                                 }`}
                    >
                      <span className="text-2xl">{app.emoji}</span>
                      <div className="flex-1">
                        <span className="font-black text-sm uppercase block">{app.name}</span>
                        <span className="text-xs text-zinc-500">{app.desc}</span>
                      </div>
                      {selected && <span className="text-lg">✓</span>}
                    </button>
                  )
                })}

                <div className="flex gap-3 mt-6">
                  <button onClick={prevStep}
                          className="flex-1 border-3 border-black bg-white py-2.5 font-black uppercase text-sm
                                     shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    ← Back
                  </button>
                  <button onClick={nextStep}
                          className="flex-1 border-3 border-black bg-black text-yellow-300 py-2.5 font-black uppercase text-sm
                                     shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div>
              <div className="bg-lime-300 border-b-4 border-black p-6">
                <h1 className="text-2xl font-black uppercase">You&apos;re All Set! 🎉</h1>
                <p className="font-bold text-sm mt-1">Let&apos;s open your dashboard.</p>
              </div>
              <div className="p-6">
                <div className="border-3 border-black bg-zinc-50 p-4 mb-6">
                  <p className="font-bold text-xs uppercase text-zinc-500 mb-2">Your selection:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedApps.length > 0 ? (
                      selectedApps.map((id) => {
                        const app = APPS.find((a) => a.id === id)
                        return (
                          <span key={id} className="border-2 border-black bg-yellow-300 px-2 py-1 font-black text-xs uppercase">
                            {app?.emoji} {app?.name}
                          </span>
                        )
                      })
                    ) : (
                      <span className="text-xs text-zinc-400">All apps (default)</span>
                    )}
                  </div>
                  <p className="font-bold text-xs mt-3 text-zinc-500">
                    Language: {language === 'hi' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={prevStep}
                          className="flex-1 border-3 border-black bg-white py-2.5 font-black uppercase text-sm
                                     shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    ← Back
                  </button>
                  <button
                    onClick={completeOnboarding}
                    disabled={saving}
                    className={`flex-1 border-3 border-black bg-black text-yellow-300 py-2.5 font-black uppercase text-sm
                               shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                               ${saving ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {saving ? 'Saving...' : 'Go to Dashboard →'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
