/**
 * lib/demo.ts — Demo mode utilities for sandboxed testing.
 *
 * When NEXT_PUBLIC_DEMO_MODE=true, all API calls return mock data instead of
 * hitting real backends. This lets potential customers try the suite without
 * requiring authentication or consuming API quotas.
 */

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}

// Mock data generators for each app

export const demoData = {
  pinai: {
    insight: {
      metrics: {
        location: {
          office: 'Ranchi GPO',
          district: 'Ranchi',
          state: 'Jharkhand',
          division: 'Chotanagpur',
        },
        recommendation:
          'Moderate market density with strong delivery infrastructure. Retail and pharmacy verticals show the highest growth potential in this pincode region.',
        business_signals: {
          market_density_score: 7.2,
          delivery_active: true,
          population_proxy_enrolments: 284500,
        },
      },
      insight:
        'Pincode 834001 covers a mid-density urban area in central Ranchi. The nearby Kanke and Doranda pincodes show complementary market gaps in education and healthcare services. Consider a cluster strategy targeting the 834001-834006 corridor.',
    },
    expansion: {
      report:
        'Candidate 834002 shows higher market density but lower delivery reliability. 834003 has untapped potential in the logistics vertical with a growing warehouse district.',
      comparisons: [
        {
          pincode: '834002',
          location: { office: 'Kanke' },
          business_signals: { market_density_score: 8.1 },
        },
        {
          pincode: '834003',
          location: { office: 'Doranda' },
          business_signals: { market_density_score: 5.9 },
        },
      ],
    },
  },

  docpatram: {
    templates: [
      { id: 'rent_agreement', name: 'Rent Agreement', category: 'Legal' },
      { id: 'employment_letter', name: 'Employment Letter', category: 'HR' },
      { id: 'noc_template', name: 'No Objection Certificate', category: 'Administrative' },
      { id: 'complaint_letter', name: 'Complaint Letter', category: 'Consumer' },
    ],
    generated: {
      title: 'Rent Agreement — Demo',
      url: '#demo-document',
      preview:
        'This Rent Agreement is executed on 16th June 2026, between the Landlord and the Tenant for the property located at Demo Address, Demo City...',
    },
  },

  vaadvivaad: {
    analysis: {
      dispute_id: 'DEMO-VV-001',
      parties: 'Party A (Supplier) vs Party B (Distributor)',
      summary:
        'Based on the submitted contract terms and communication records, the AI analysis identifies a clear breach of delivery timelines under Clause 4.2. The recommended resolution is a partial refund of 35% of the contract value with revised delivery schedules.',
      recommendation: 'Mediation recommended before formal arbitration.',
      confidence: 0.82,
    },
  },

  hindidiff: {
    generated: {
      prompt: 'एक सुंदर हिमालय का दृश्य',
      image_url: 'https://placehold.co/512x512/FCD34D/000000?text=Demo+Image',
      seed: 42,
    },
  },

  kisan: {
    response: {
      query: 'मेरी गेहूं की फसल में पीलापन आ रहा है, क्या करूँ?',
      answer:
        'गेहूं में पीलापन आमतौर पर नाइट्रोजन की कमी या अधिक पानी के कारण होता है। 20-25 किग्रा यूरिया प्रति एकड़ का छिड़काव करें। सिंचाई का अंतराल बढ़ाएँ। अगर समस्या बनी रहे तो अपने नज़दीकी KVK से संपर्क करें।',
      source: 'KCC Dataset — Jharkhand Region',
      language: 'hi',
    },
  },

  dashboard: {
    user: {
      email: 'demo@ayojit.com',
      id: 'demo-user-id',
    },
    subscriptions: [
      { app_id: 'pinai', plan: 'free', status: 'active' },
      { app_id: 'docpatram', plan: 'free', status: 'active' },
      { app_id: 'hindidiff', plan: 'paid', status: 'active' },
    ],
    usage: [
      { app_id: 'pinai', count: 3 },
      { app_id: 'docpatram', count: 1 },
      { app_id: 'hindidiff', count: 7 },
    ],
  },
}
