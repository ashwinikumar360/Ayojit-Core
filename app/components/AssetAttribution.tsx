'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export interface Asset {
  id: string
  name: string
  source_url: string
  version_tag: string
  license_type: string
  commercial_use: boolean
  attribution_requirement?: boolean
  share_alike?: boolean
  status: string
  fallback_asset_id?: string | null
}

const LOCAL_REGISTRY: Record<string, Asset> = {
  "black-forest-labs/FLUX.1-schnell": {
    id: "black-forest-labs/FLUX.1-schnell",
    name: "FLUX.1 [schnell]",
    source_url: "https://huggingface.co/black-forest-labs/FLUX.1-schnell",
    version_tag: "refs/heads/main",
    license_type: "Apache-2.0",
    commercial_use: true,
    attribution_requirement: false,
    share_alike: false,
    status: "approved",
    fallback_asset_id: null
  },
  "sarvamai/sarvam-2b-v0.5": {
    id: "sarvamai/sarvam-2b-v0.5",
    name: "Sarvam-2B v0.5",
    source_url: "https://huggingface.co/sarvamai/sarvam-2b-v0.5",
    version_tag: "refs/heads/main",
    license_type: "Apache-2.0",
    commercial_use: true,
    attribution_requirement: false,
    share_alike: false,
    status: "approved",
    fallback_asset_id: null
  },
  "openai/whisper-large-v3": {
    id: "openai/whisper-large-v3",
    name: "Whisper Large v3",
    source_url: "https://huggingface.co/openai/whisper-large-v3",
    version_tag: "refs/heads/main",
    license_type: "MIT",
    commercial_use: true,
    attribution_requirement: false,
    share_alike: false,
    status: "approved",
    fallback_asset_id: null
  },
  "sentence-transformers/paraphrase-multilingual-mpnet-base-v2": {
    id: "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    name: "paraphrase-multilingual-mpnet-base-v2",
    source_url: "https://huggingface.co/sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    version_tag: "refs/heads/main",
    license_type: "Apache-2.0",
    commercial_use: true,
    attribution_requirement: false,
    share_alike: false,
    status: "approved",
    fallback_asset_id: "sentence-transformers/all-MiniLM-L6-v2"
  },
  "sentence-transformers/all-MiniLM-L6-v2": {
    id: "sentence-transformers/all-MiniLM-L6-v2",
    name: "all-MiniLM-L6-v2",
    source_url: "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2",
    version_tag: "1110a243fdf4706b3f48f1d95db1a4f5529b4d41",
    license_type: "Apache-2.0",
    commercial_use: true,
    attribution_requirement: false,
    share_alike: false,
    status: "approved",
    fallback_asset_id: null
  },
  "ai4bharat/indic-parler-tts": {
    id: "ai4bharat/indic-parler-tts",
    name: "indic-parler-tts",
    source_url: "https://huggingface.co/ai4bharat/indic-parler-tts",
    version_tag: "refs/heads/main",
    license_type: "Apache-2.0",
    commercial_use: true,
    attribution_requirement: false,
    share_alike: false,
    status: "approved",
    fallback_asset_id: null
  },
  "IndicTrans2": {
    id: "IndicTrans2",
    name: "IndicTrans2",
    source_url: "https://github.com/AI4Bharat/IndicTrans2",
    version_tag: "refs/heads/main",
    license_type: "MIT",
    commercial_use: true,
    attribution_requirement: false,
    share_alike: false,
    status: "approved",
    fallback_asset_id: null
  },
  "data.gov.in/pincode": {
    id: "data.gov.in/pincode",
    name: "All India Pincode Directory",
    source_url: "https://data.gov.in/resource/all-india-pincode-directory",
    version_tag: "2026-06-snapshot",
    license_type: "GODL-India",
    commercial_use: true,
    attribution_requirement: true,
    share_alike: false,
    status: "approved_with_attribution"
  },
  "data.gov.in/kcc": {
    id: "data.gov.in/kcc",
    name: "Kisan Call Centre Q&A Dataset",
    source_url: "https://data.gov.in/resource/kisan-call-centre-q-a",
    version_tag: "2026-06-snapshot",
    license_type: "GODL-India",
    commercial_use: true,
    attribution_requirement: true,
    share_alike: false,
    status: "approved_with_attribution"
  },
  "data.gov.in/legal_judgments": {
    id: "data.gov.in/legal_judgments",
    name: "Public Legal Judgments Database",
    source_url: "https://data.gov.in",
    version_tag: "2026-06-snapshot",
    license_type: "GODL-India",
    commercial_use: true,
    attribution_requirement: true,
    share_alike: false,
    status: "approved_with_attribution"
  },
  "data.gov.in/public_templates": {
    id: "data.gov.in/public_templates",
    name: "Indian Government Form Templates",
    source_url: "https://data.gov.in",
    version_tag: "2026-06-snapshot",
    license_type: "GODL-India",
    commercial_use: true,
    attribution_requirement: true,
    share_alike: false,
    status: "approved_with_attribution"
  },
  "data.gov.in/census2011": {
    id: "data.gov.in/census2011",
    name: "Census of India 2011 Tables",
    source_url: "https://data.gov.in",
    version_tag: "2026-06-snapshot",
    license_type: "GODL-India",
    commercial_use: true,
    attribution_requirement: true,
    share_alike: false,
    status: "approved_with_attribution"
  }
}

interface Props {
  assetIds: string[]
}

export default function AssetAttribution({ assetIds }: Props) {
  const supabase = createClient()
  const [assets, setAssets] = useState<Asset[]>([])

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('asset_registry')
          .select('*')
          .in('id', assetIds)
        
        if (error || !data || data.length === 0) {
          throw new Error("Supabase fetch failed or returned empty")
        }
        setAssets(data as Asset[])
      } catch (err) {
        // Fallback to local registry
        const fallbackData = assetIds
          .map(id => LOCAL_REGISTRY[id])
          .filter(Boolean)
        setAssets(fallbackData)
      }
    })()
  }, [assetIds])

  if (assets.length === 0) return null

  return (
    <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
      <h3 className="text-lg font-black uppercase mb-4 border-b-2 border-black pb-1 flex justify-between items-center">
        <span>🛡️ Open Source Asset Compliance</span>
        <span className="text-[10px] font-mono border-2 border-black bg-emerald-200 px-2 py-0.5">Approved Licenses</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {assets.map(asset => {
          const isBlocked = asset.status === 'blocked' || !asset.commercial_use
          const isFallback = asset.fallback_asset_id && (isBlocked || asset.status === 'pending_review')

          return (
            <div key={asset.id} className="border-2 border-black bg-zinc-50 p-4 relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-start mb-2">
                <a 
                  href={asset.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-black text-sm hover:underline uppercase break-all pr-2"
                >
                  {asset.name}
                </a>
                <span className={`text-[10px] font-bold px-2 py-0.5 border border-black ${
                  isBlocked ? 'bg-red-200' : asset.attribution_requirement ? 'bg-blue-200' : 'bg-emerald-200'
                }`}>
                  {asset.license_type}
                </span>
              </div>
              
              <div className="text-[10px] font-mono text-zinc-600 mb-2 truncate">
                ID: {asset.id}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mb-2">
                Version / Hash: <span className="font-semibold">{asset.version_tag}</span>
              </div>

              {/* Status and attributions */}
              <div className="mt-2 pt-2 border-t border-zinc-300 flex flex-wrap gap-2 items-center">
                {isFallback ? (
                  <span className="text-[9px] font-black uppercase border-2 border-black bg-yellow-200 px-2 py-0.5">
                    Fallback Swapped
                  </span>
                ) : asset.attribution_requirement ? (
                  <span className="text-[9px] font-black uppercase border-2 border-black bg-blue-200 px-2 py-0.5">
                    Attribution Required
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase border-2 border-black bg-emerald-200 px-2 py-0.5">
                    License Verified
                  </span>
                )}
                
                {asset.attribution_requirement && (
                  <div className="text-[9px] font-bold text-zinc-500">
                    Sourced via MeitY Open Data India
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
