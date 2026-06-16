'use client'

export default function Refund() {
  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-3xl mx-auto border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black uppercase mb-6 border-b-4 border-black pb-2">Refund & Cancellation</h1>
        
        <p className="font-bold mb-4">Last Updated: June 15, 2026</p>

        <section className="mb-6">
          <h2 className="text-xl font-black uppercase mb-2">1. Subscription Cancellations</h2>
          <p className="text-zinc-700">
            You can cancel your active monthly subscriptions (PinAI, DocPatram, HindiDiff) at any time directly through your user billing dashboard. Following cancellation, your subscription status will remain active until the end of your current paid billing period, after which it will revert to the free tier.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-black uppercase mb-2">2. Dispute Mediation Fees</h2>
          <p className="text-zinc-700">
            VaadVivaad charges a ₹499 one-time mediation fee per dispute. Because the Sarvam-105B computation runs immediately upon submission, these mediation requests are non-refundable once processed.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-black uppercase mb-2">3. Refund Requests</h2>
          <p className="text-zinc-700">
            If a double charge or transaction error occurs during billing via Dodo Payments, please raise a ticket with payment IDs within 7 business days. Approved refunds are credited to the original payment source within 5–7 working days.
          </p>
        </section>

        <a href="/dashboard" className="inline-block border-2 border-black bg-yellow-300 px-4 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}
