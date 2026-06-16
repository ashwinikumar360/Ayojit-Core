'use client'

export default function Terms() {
  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-3xl mx-auto border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black uppercase mb-6 border-b-4 border-black pb-2">Terms of Service</h1>
        
        <p className="font-bold mb-4">Last Updated: June 15, 2026</p>

        <section className="mb-6">
          <h2 className="text-xl font-black uppercase mb-2">1. Acceptance of Terms</h2>
          <p className="text-zinc-700">
            By accessing and using Ayojit Intelligence applications, you agree to comply with and be bound by these terms. If you do not agree, please discontinue usage immediately.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-black uppercase mb-2">2. Usage Limits & Subscription</h2>
          <p className="text-zinc-700">
            We provide a free usage quota for our services. Once the free tier threshold is reached, you must subscribe to our paid plans via Dodo Payments to continue using the endpoints. Account sharing or abusing API quota checks is strictly prohibited.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-black uppercase mb-2">3. Sourcing and Liability</h2>
          <p className="text-zinc-700">
            Ayojit Intelligence uses models and datasets sourced from the Government of India's AIKosh repository. Ayojit is not responsible for any inaccuracies, model hallucinations, or financial decisions made based on AI output.
          </p>
        </section>

        <a href="/dashboard" className="inline-block border-2 border-black bg-yellow-300 px-4 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}
