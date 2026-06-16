'use client'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-3xl mx-auto border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black uppercase mb-6 border-b-4 border-black pb-2">Privacy Policy</h1>
        
        <p className="font-bold mb-4">Last Updated: June 15, 2026</p>
        <p className="mb-4 text-zinc-700">
          This Privacy Policy describes how we process user data in compliance with the **Digital Personal Data Protection (DPDP) Act, 2023** of India.
        </p>

        <section className="mb-6">
          <h2 className="text-xl font-black uppercase mb-2">1. Information We Collect</h2>
          <p className="text-zinc-700">
            We collect basic contact information (full name, email address, phone number) when you register via Supabase Auth. We do not store financial payment information directly; all subscription payment records are processed securely through Dodo Payments.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-black uppercase mb-2">2. PII Protection and Anonymization</h2>
          <p className="text-zinc-700">
            Before parsing any document uploads in DocPatram, files are processed through our AIKosh ARX Anonymizer to mask sensitive data (such as Aadhaar digits, PAN identifiers, and bank info). Non-anonymized inputs are discarded from cache after processing.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-black uppercase mb-2">3. User Rights</h2>
          <p className="text-zinc-700">
            Under the DPDP Act 2023, you have the right to request access to, correction of, or erasure of your personal details stored in our database. You can manage your profile or withdraw consent by contacting our studio team.
          </p>
        </section>

        <a href="/dashboard" className="inline-block border-2 border-black bg-yellow-300 px-4 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}
