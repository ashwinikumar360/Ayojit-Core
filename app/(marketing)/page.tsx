'use client'

import { useState } from 'react'

const APPS = [
  {
    id: 'kisan-voice-ai',
    name: 'Kisan Voice AI',
    emoji: '🌾',
    color: 'bg-orange-300',
    tagline: 'Voice-based agricultural Q&A',
    desc: 'Farmers call in, speak in their language, and receive crop advice sourced from Krishi Vigyan Kendra and Kisan Call Centre datasets.',
    audience: 'Farmers, State Agriculture Departments',
    freeLimit: 'Unlimited (B2G demo)',
    price: 'Government SLA',
  },
  {
    id: 'pinai',
    name: 'PinAI',
    emoji: '📍',
    color: 'bg-yellow-300',
    tagline: 'Pincode business intelligence',
    desc: 'Enter any Indian pincode and get market density scores, delivery infrastructure data, population proxies, and AI-generated business viability recommendations.',
    audience: 'MSMEs, Retail Chains, Consultants',
    freeLimit: '5 queries/day',
    price: '₹299/month',
  },
  {
    id: 'docpatram',
    name: 'DocPatram',
    emoji: '📄',
    color: 'bg-lime-300',
    tagline: 'AI document generation & OCR',
    desc: 'Generate rent agreements, NOCs, complaint letters, and employment documents. OCR scanning with PII scrubbing built in.',
    audience: 'Citizens, Panchayats, Legal Offices',
    freeLimit: '5 documents/day',
    price: '₹999/month',
  },
  {
    id: 'vaadvivaad',
    name: 'VaadVivaad',
    emoji: '⚖️',
    color: 'bg-red-300',
    tagline: 'Contract dispute mediation',
    desc: 'Submit contract disputes for AI-assisted preliminary analysis. Generates structured mediation summaries for MSME facilitation councils.',
    audience: 'MSMEs, Business Partners',
    freeLimit: '1 dispute (lifetime)',
    price: '₹499/dispute',
  },
  {
    id: 'hindidiff',
    name: 'HindiDiff',
    emoji: '🎨',
    color: 'bg-amber-200',
    tagline: 'Hindi text-to-image generation',
    desc: 'Generate images from Hindi prompts with native Devanagari text rendering. Built for local designers and content creators.',
    audience: 'Designers, Content Creators',
    freeLimit: '5 images/day',
    price: '₹99/month',
  },
]

const TRUST_BADGES = [
  { label: 'AIKosh Powered', icon: '🇮🇳' },
  { label: 'Open Source', icon: '🔓' },
  { label: 'DPDP Compliant', icon: '🛡️' },
  { label: 'MIT Licensed', icon: '📄' },
  { label: 'Zero Vendor Lock-in', icon: '🔗' },
]

export default function LandingPage() {
  const [activePricing, setActivePricing] = useState<'free' | 'pro'>('free')

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-black">
      {/* Navigation Bar */}
      <nav className="border-b-4 border-black bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <span className="font-black text-xl uppercase tracking-tight">Ayojit Intelligence</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-bold uppercase">
            <a href="#apps" className="hover:underline">Apps</a>
            <a href="#pricing" className="hover:underline">Pricing</a>
            <a href="#government" className="hover:underline">Government</a>
            <a href="/status" className="hover:underline">Status</a>
            <a href="/changelog" className="hover:underline">Changelog</a>
          </div>
          <div className="flex gap-3">
            <a href="/dashboard"
               className="border-2 border-black bg-white px-4 py-2 font-black text-sm uppercase
                          shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                          hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
              Log In
            </a>
            <a href="/onboarding"
               className="border-2 border-black bg-black text-yellow-300 px-4 py-2 font-black text-sm uppercase
                          shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px]
                          hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="border-4 border-black bg-yellow-300 p-8 md:p-12
                          shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-bold text-sm uppercase tracking-wider mb-3 border-2 border-black bg-white inline-block px-3 py-1">
              Built on AIKosh · Government of India Open Data
            </p>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-tight mb-4">
              Civic AI for<br />1.4 Billion Citizens
            </h1>
            <p className="text-lg md:text-xl font-bold max-w-2xl mb-8 leading-relaxed">
              Five production-grade AI tools for Indian farmers, MSMEs, and citizens. 
              Powered by open models from AIKosh. Free tiers for everyone. 
              Zero compute costs. Full source available.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="/onboarding"
                 className="border-4 border-black bg-black text-yellow-300 px-8 py-4 font-black text-lg uppercase
                            shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px]
                            hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                Start Free →
              </a>
              <a href="https://github.com/ashwinikumar360/Ayojit-Core"
                 target="_blank" rel="noopener noreferrer"
                 className="border-4 border-black bg-white px-8 py-4 font-black text-lg uppercase
                            shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px]
                            hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                View Source ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {TRUST_BADGES.map((badge) => (
              <span key={badge.label}
                    className="border-2 border-black bg-white px-4 py-2 font-bold text-xs uppercase
                               shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {badge.icon} {badge.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* App Showcase Grid */}
      <section id="apps" className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-8 border-b-4 border-black pb-2">
            The 5-App Suite
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {APPS.map((app) => (
              <div key={app.id}
                   className={`border-4 border-black ${app.color} p-6
                              shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                              hover:translate-x-[2px] hover:translate-y-[2px]
                              hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all`}>
                <span className="text-4xl block mb-3">{app.emoji}</span>
                <h3 className="text-xl font-black uppercase mb-1">{app.name}</h3>
                <p className="text-sm font-bold text-zinc-700 mb-3">{app.tagline}</p>
                <p className="text-xs font-medium text-zinc-600 mb-4 leading-relaxed">{app.desc}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase">Free: {app.freeLimit}</p>
                    <p className="text-sm font-black">{app.price}</p>
                  </div>
                  <a href={`/apps/${app.id}`}
                     className="border-2 border-black bg-white px-3 py-1.5 font-black text-xs uppercase
                                shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    Try →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-12 bg-white border-y-4 border-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Pricing</h2>
          <p className="font-bold text-zinc-600 mb-8">Free tiers for everyone. Pro plans for heavy users.</p>

          <div className="flex gap-2 mb-8">
            <button onClick={() => setActivePricing('free')}
                    className={`border-2 border-black px-4 py-2 font-black text-sm uppercase transition-all
                               ${activePricing === 'free' ? 'bg-black text-yellow-300' : 'bg-white'}`}>
              Free Tier
            </button>
            <button onClick={() => setActivePricing('pro')}
                    className={`border-2 border-black px-4 py-2 font-black text-sm uppercase transition-all
                               ${activePricing === 'pro' ? 'bg-black text-yellow-300' : 'bg-white'}`}>
              Pro Plans
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-4 border-black bg-zinc-100">
                  <th className="p-3 text-left font-black text-xs uppercase border-r-2 border-black">App</th>
                  <th className="p-3 text-left font-black text-xs uppercase border-r-2 border-black">
                    {activePricing === 'free' ? 'Free Limit' : 'Pro Limit'}
                  </th>
                  <th className="p-3 text-left font-black text-xs uppercase">
                    {activePricing === 'free' ? 'Cost' : 'Price'}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold">
                {APPS.map((app) => (
                  <tr key={app.id} className="border-b-2 border-black">
                    <td className="p-3 border-r-2 border-black">
                      {app.emoji} {app.name}
                    </td>
                    <td className="p-3 border-r-2 border-black font-mono text-xs">
                      {activePricing === 'free' ? app.freeLimit : 'Expanded daily limits'}
                    </td>
                    <td className="p-3">
                      {activePricing === 'free' ? (
                        <span className="border-2 border-black bg-lime-300 px-2 py-0.5 font-black text-xs uppercase">
                          Free
                        </span>
                      ) : (
                        <span className="font-black">{app.price}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Government Partnership Section */}
      <section id="government" className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="border-4 border-black bg-lime-300 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">
              🏛️ For Government Partners
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="border-4 border-black bg-white p-5">
                <h3 className="font-black text-lg uppercase mb-2">Kisan Voice AI for Agriculture Depts</h3>
                <p className="text-sm font-medium leading-relaxed">
                  Deploy as an automated IVR for state agriculture departments. Citizens call in,
                  queries are processed against localized KVK and KCC datasets, and responses are
                  read back in regional languages.
                </p>
              </div>
              <div className="border-4 border-black bg-white p-5">
                <h3 className="font-black text-lg uppercase mb-2">VaadVivaad for MSME Councils</h3>
                <p className="text-sm font-medium leading-relaxed">
                  Integrate with MSME facilitation councils for automated preliminary mediation
                  summaries. Reduces case processing time from weeks to hours.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              <a href="mailto:tarai.ashwinikumar@gmail.com"
                 className="border-4 border-black bg-black text-lime-300 px-6 py-3 font-black uppercase
                            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                Request Pilot →
              </a>
              <a href="/docs/GOVERNMENT_PILOT.md"
                 className="border-4 border-black bg-white px-6 py-3 font-black uppercase
                            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                Read Pilot Guide
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="px-6 py-12 bg-white border-y-4 border-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-3xl block mb-2">1️⃣</span>
              <h3 className="font-black uppercase mb-2">Open Models from AIKosh</h3>
              <p className="text-sm font-medium text-zinc-600">
                Every AI model is sourced from AIKosh (IndiaAI, MeitY). Apache-2.0, MIT, or GODL-India licensed.
                No proprietary dependencies.
              </p>
            </div>
            <div className="border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-3xl block mb-2">2️⃣</span>
              <h3 className="font-black uppercase mb-2">Zero Compute Costs</h3>
              <p className="text-sm font-medium text-zinc-600">
                Heavy inference runs on Hugging Face Spaces. Backends are thin FastAPI proxies on Render free tier.
                Frontend on Vercel. Monthly server cost: ₹0.
              </p>
            </div>
            <div className="border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-3xl block mb-2">3️⃣</span>
              <h3 className="font-black uppercase mb-2">Self-Hostable</h3>
              <p className="text-sm font-medium text-zinc-600">
                Full Docker Compose setup included. Deploy on government cloud, state data centers, or your own
                infrastructure with one command.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-black text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-black uppercase text-yellow-300 mb-3">Ayojit Intelligence</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Civic AI for Indian citizens, farmers, and MSMEs. Built on open data.
              </p>
            </div>
            <div>
              <h4 className="font-black uppercase text-sm mb-3">Apps</h4>
              <div className="space-y-2 text-xs text-zinc-400">
                {APPS.map((app) => (
                  <a key={app.id} href={`/apps/${app.id}`} className="block hover:text-white">
                    {app.emoji} {app.name}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-black uppercase text-sm mb-3">Resources</h4>
              <div className="space-y-2 text-xs text-zinc-400">
                <a href="/status" className="block hover:text-white">Status</a>
                <a href="/changelog" className="block hover:text-white">Changelog</a>
                <a href="/roadmap" className="block hover:text-white">Roadmap</a>
                <a href="https://github.com/ashwinikumar360/Ayojit-Core" className="block hover:text-white">GitHub</a>
              </div>
            </div>
            <div>
              <h4 className="font-black uppercase text-sm mb-3">Legal</h4>
              <div className="space-y-2 text-xs text-zinc-400">
                <a href="/legal/terms" className="block hover:text-white">Terms of Service</a>
                <a href="/legal/privacy" className="block hover:text-white">Privacy Policy</a>
                <a href="/legal/refund" className="block hover:text-white">Refund Policy</a>
                <a href="/legal/attribution" className="block hover:text-white">Attribution</a>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-6 text-[10px] text-zinc-500 font-mono leading-relaxed">
            This application uses publicly available AI models/datasets sourced via{' '}
            <a href="https://aikosh.indiaai.gov.in" className="underline text-zinc-400">AIKosh</a>{' '}
            (aikosh.indiaai.gov.in), maintained by IndiaAI under the Ministry of Electronics & Information Technology,
            Government of India. Ayojit Intelligence is an independent product and is not affiliated with, endorsed by,
            or sponsored by AIKosh, IndiaAI, or the Government of India.
          </div>
        </div>
      </footer>
    </div>
  )
}
