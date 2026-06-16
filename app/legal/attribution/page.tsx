'use client'

export default function Attribution() {
  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-black">
      <div className="max-w-3xl mx-auto border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black uppercase mb-6 border-b-4 border-black pb-2">Data & Model Attribution</h1>
        
        <p className="mb-6 text-zinc-700">
          In compliance with the terms of open data platforms in India, we factually credit the following sources:
        </p>

        <table className="w-full border-4 border-black mb-8 text-left border-collapse">
          <thead>
            <tr className="bg-yellow-300 border-b-4 border-black">
              <th className="p-3 font-black uppercase border-r-4 border-black">Application</th>
              <th className="p-3 font-black uppercase border-r-4 border-black">Dataset / Model</th>
              <th className="p-3 font-black uppercase">Provider / Source</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b-2 border-black">
              <td className="p-3 font-bold border-r-4 border-black">Kisan Voice AI</td>
              <td className="p-3 border-r-4 border-black">Kisan Call Centre Transcripts</td>
              <td className="p-3">AIKosh (IndiaAI / MeitY)</td>
            </tr>
            <tr className="border-b-2 border-black">
              <td className="p-3 font-bold border-r-4 border-black">PinAI</td>
              <td className="p-3 border-r-4 border-black">All India Pincode Directory & Census Data</td>
              <td className="p-3">AIKosh (IndiaAI / MeitY)</td>
            </tr>
            <tr className="border-b-2 border-black">
              <td className="p-3 font-bold border-r-4 border-black">DocPatram</td>
              <td className="p-3 border-r-4 border-black">Patram 7B Vision-Language Model & ARX</td>
              <td className="p-3">BharatGen / AIKosh</td>
            </tr>
            <tr className="border-b-2 border-black">
              <td className="p-3 font-bold border-r-4 border-black">VaadVivaad</td>
              <td className="p-3 border-r-4 border-black">Sarvam-105B Reasoning Model</td>
              <td className="p-3">Sarvam AI / AIKosh</td>
            </tr>
            <tr>
              <td className="p-3 font-bold border-r-4 border-black">HindiDiff</td>
              <td className="p-3 border-r-4 border-black">Baaz-v1 Diffusion Model</td>
              <td className="p-3">Central University of Punjab / AIKosh</td>
            </tr>
          </tbody>
        </table>

        <div className="border-2 border-dashed border-zinc-400 bg-zinc-50 p-4 mb-6 text-sm font-mono text-zinc-600">
          Disclaimer: Sourcing assets via AIKosh (aikosh.indiaai.gov.in) does not represent,
          imply, or constitute any official endorsement or certification by IndiaAI, MeitY, or
          the Government of India.
        </div>

        <a href="/dashboard" className="inline-block border-2 border-black bg-yellow-300 px-4 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}
