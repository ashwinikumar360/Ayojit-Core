# Ayojit Intelligence 🇮🇳

[![Build Status](https://github.com/ashwinikumar360/Ayojit-Core/workflows/CI/badge.svg)](https://github.com/ashwinikumar360/Ayojit-Core/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-emerald.svg)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg)](https://supabase.com/)

Ayojit Intelligence is a civic-AI product studio providing five dedicated utility applications for Indian citizens, farmers, MSMEs, and government administrative departments, powered entirely by open models and public datasets from **AIKosh** (aikosh.indiaai.gov.in).

---

## 🌟 The 5-App Civic Suite

| Application | Emoji | Core Purpose | Target Audience | Pricing Model (INR) |
| :--- | :---: | :--- | :--- | :--- |
| **Kisan Voice AI** | 🌾 | Regional voice agricultural Q&A | Farmers, State Agri Departments | Free / Managed SLA |
| **PinAI** | 📍 | Location intelligence & center search | Citizens, local MSMEs | Free / ₹299/mo Pro |
| **DocPatram** | 📄 | OCR scan, PII scrub, doc generator | Panchayats, citizens | Free / ₹999/mo Pro |
| **VaadVivaad** | ⚖️ | AI dispute mediation & arbitration | MSME business partners | Free / ₹499 per dispute |
| **HindiDiff** | 🎨 | Devanagari text-to-image generator | Local designers & creators | Free / ₹99/mo Pro |

---

## 🛠️ Architecture Overview

Ayojit is architected as a lightweight, low-overhead microservices network targeting zero idle compute costs:

```
                            +-----------------------------------+
                            |  Next.js Web Portal (Tailwind v3) |
                            +-----------------------------------+
                                              |
                                              | API Requests (Supabase JWT / API Keys)
                                              v
      +-------------------------------------------------------------------------------+
      |                        FastAPI Unified App Gateway                            |
      |   (8000: Kisan Voice | 8001: PinAI | 8002: DocPatram | 8003: VaadVivaad)      |
      +-------------------------------------------------------------------------------+
        /           |                   |                     |                \
       /            |                   |                     |                 \
      v             v                   v                     v                  v
+----------+  +------------+     +--------------+      +--------------+   +-------------+
| Twilio   |  | Bhashini   |     | Supabase DB  |      | HuggingFace  |   | Cloudinary  |
| Voice/IVR|  | Translation|     | RLS / JWT    |      | (HindiDiff / |   | Storage     |
| Portal   |  | STT & TTS  |     | Usage Logs   |      |  DocPatram)  |   | CDN         |
+----------+  +------------+     +--------------+      +--------------+   +-------------+
```

- **Frontend**: Next.js App Router with Tailwind CSS styling following a clean Neo-Brutalist design system.
- **Backend**: Python FastAPI gateways handling rate-limiting (SlowAPI), RLS enforcement, and model routing.
- **Database**: Supabase PostgreSQL with row-level security (RLS) policies and transaction logging.
- **Billing**: Integrated with **Dodo Payments** for recurring subscriptions and transaction handling.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites

- Node.js (v18+)
- Python (3.10+)
- Supabase CLI / Local Instance (or connection strings)

### One-Command Launch

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ashwinikumar360/Ayojit-Core.git
   cd Ayojit-Core
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env.local
   # Update variables in .env.local
   ```

3. **Run the local workspace:**
   The suite includes an orchestrator script that automatically installs dependencies, configures virtual environments, and starts the frontend plus the five microservices.
   ```bash
   python run_suite.py
   ```

---

## 🐳 Docker Self-Hosting

Deploy the complete suite with a single command using Docker:

```bash
docker compose up -d
```

For detailed production configurations, check the [Self-Hosting Guide](docs/SELF_HOSTING.md).

---

## 🌐 Public API v1

Ayojit exposes a developer-friendly API for building public service integrations. 

### Quick Example (Get location signals)

```bash
curl -X POST https://api.ayojit.com/v1/pinai/insight \
     -H "X-API-Key: ak_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"pincode": "834001", "business_type": "retail"}'
```

Refer to the full [API v1 Reference](docs/API_V1.md) and [OpenAPI Spec](docs/openapi.yaml) for schemas, scopes, and response structures.

---

## 🇮🇳 Open Asset & AIKosh Compliance

This project is built to showcase the power of Indian digital public datasets and open models:

- **Bhashini API**: Direct translation, speech-to-text, and text-to-speech for regional Indian languages.
- **Patram-7B**: Document layout generation.
- **GODL-India Census Datasets**: High-precision demographic and pincode listings.

All open assets conform to their respective permissive licenses. Swaps and fallbacks are documented in the [Compliance Registry](app/dashboard/page.tsx).

---

## 🛡️ Security & DPDP Compliance

- **PII Scrubbing**: Presidio integration filters personally identifiable information before hitting models.
- **JWT & RLS Enforcement**: Row-Level Security active on all tables, ensuring strict data boundaries.
- **Signature Audits**: All webhook endpoints (Dodo Payments) enforce HMAC SHA256 signature verification.

---

## 📜 Verbatim Attribution Disclaimer

This application uses publicly available AI models/datasets sourced via AIKosh (aikosh.indiaai.gov.in), an AI repository maintained by IndiaAI under the Ministry of Electronics & Information Technology, Government of India. Ayojit Intelligence is an independent product and is not affiliated with, endorsed by, or sponsored by AIKosh, IndiaAI, or the Government of India.

---

## 📄 License

Licensed under the [MIT License](LICENSE). 

For support or government partnership inquiries, contact Ashwini Kumar Tarai at `tarai.ashwinikumar@gmail.com`.
