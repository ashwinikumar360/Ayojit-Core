# Ayojit Intelligence

Ayojit Intelligence is a civic-AI product studio running five dedicated utility applications for Indian citizens, farmers, MSMEs, and government administrative departments, built on open models and public datasets.

## Context & Problem Statement

Public service delivery in India faces scale bottlenecks. Over 140 million farmers require custom agronomic advice, 63 million MSMEs navigate regulatory compliance, and hundreds of millions of citizens manage official documents daily. While the Government of India has built digital public infrastructure (DPI), custom end-user tooling remains fragmented.

The Ministry of Electronics & Information Technology (MeitY), through IndiaAI, maintains the AIKosh platform. AIKosh consolidates pre-trained models and verified datasets, removing the upfront research costs for civic builders. Ayojit Intelligence bundles these open assets into lightweight, production-grade applications that run on low-overhead endpoints.

## The Ayojit 5-App Suite

| Application | Core Problem Solved | Target Audience | Free Limit | Paid Price |
| --- | --- | --- | --- | --- |
| **Kisan Voice AI** | Direct voice-based agricultural Q&A in regional languages. | Farmers, State Agri Depts | Bursty (B2G Demo) | Managed SLA (Govt contract) |
| **PinAI** | Location-based coordinate search for Aadhaar centers. | Citizens, MSMEs | 5 queries/day | ₹299/month subscription |
| **DocPatram** | OCR scanning, PII scrubbing, and document creation. | Citizens, Panchayats | 5 documents/day | ₹999/month subscription |
| **VaadVivaad** | Structured arbitration and contract dispute mediation. | MSME business partners | 1 dispute (lifetime) | ₹499/dispute one-time payment |
| **HindiDiff** | Text-to-image generation rendering Devanagari text. | Local designers, content creators | 5 images/day | ₹99/month subscription |

## Architecture Layout

```
                                +---------------------------+
                                |  Next.js Portal (Vercel)  |
                                +---------------------------+
                                              |
                                              | API Calls (with Supabase JWT)
                                              v
      +-------------------------------------------------------------------------------+
      |                        FastAPI App Gateway (Render)                           |
      |   (8000: Kisan Voice | 8001: PinAI | 8002: DocPatram | 8003: VaadVivaad)      |
      +-------------------------------------------------------------------------------+
        /           |                   |                     |                \
       /            |                   |                     |                 \
      v             v                   v                     v                  v
+----------+  +------------+     +--------------+      +--------------+   +-------------+
| Twilio   |  | Bhashini   |     | Supabase DB  |      | HF Spaces    |   | Cloudinary  |
| Voice In |  | STT/TTS API|     | JWT/Auth/RLS |      | (HindiDiff   |   | Asset CDN   |
| & Sign   |  | Translation|     | Usage Logs   |      |  & Patram)   |   | Storage     |
+----------+  +------------+     +--------------+      +--------------+   +-------------+
                                                              |
                                                              v
                                                       +--------------+
                                                       | Sarvam API / |
                                                       | local SQLite |
                                                       +--------------+
```

## For Developers

Follow these steps to run the complete suite locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ashwinikumar360/Ayojit-Core.git
   cd Ayojit-Core
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and fill in the required keys:
   ```bash
   cp .env.example .env.local
   ```

3. **Install frontend dependencies:**
   ```bash
   npm install
   ```

4. **Set up Python virtual environment:**
   Create a virtual environment in the parent folder or root directory and install dependencies:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Unix
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

5. **Start all services:**
   Run the orchestrator script to spin up the frontend and all five microservices:
   ```bash
   python run_suite.py
   ```

## For Government Partners

Ayojit provides two apps structured for Business-to-Government (B2G) deployments:

- **Kisan Voice AI:** Deploys as an automated IVR solution for state agriculture departments. Incoming citizen calls are transcribed via Bhashini, searched against localized Krishi Vigyan Kendra (KVK) and Kisan Call Center (KCC) datasets, and read back to the farmer.
- **VaadVivaad:** Serves as a digital portal for MSME facilitation councils, automating initial mediation summaries before formal hearings.

**Deployment Models:**
- **SaaS Deployment:** Managed by Ayojit, hosted on secured Indian Cloud Service Providers (MEITY empanelled).
- **On-Premise (Govt Cloud):** Packaged as Docker containers for deployment on state data centers.

To request a pilot deployment, contact `tarai.ashwinikumar@gmail.com` or open a partnership issue template.

## For Investors

- **Addressable Market:** Over 140M land-holding farmers, 63M registered MSMEs, and 1.4B citizens interacting with official documentation.
- **Monetization Mechanics:** Built on a freemium model. Free tiers are capped to prevent API rate overflows. Once limits are hit, users pay subscription fees ranging from ₹99 to ₹999/month (via Dodo Payments), which covers their marginal compute cost.
- **Zero Compute Costs:** Because backend services offload all heavy deep learning tasks to serverless models (OpenRouter and Hugging Face Free Inference API), the studio's monthly server upkeep cost is ₹0.
- **Defensibility Moat:** Integrates localized public datasets from AIKosh. Once customized for a specific region, it is highly defensible.

## AI Models & Datasets Reference

| Asset Name | Functionality | AIKosh Source | License Type |
| --- | --- | --- | --- |
| **Baaz-v1** | Hindi text-to-image generator | AIKosh Models | Creative Commons BY-NC |
| **Patram-7B** | Document generation LLM | AIKosh Models | Open / Custom |
| **KCC Transcripts** | RAG search base for farmers | AIKosh Datasets | GODL-India |
| **Pincode Registry** | Aadhaar and location coordinates | AIKosh Datasets | GODL-India |

## Security Infrastructure

- **Profile Protection:** JSON Web Tokens (JWT) verified on every query.
- **Data Boundaries:** Row Level Security (RLS) active on all user data.
- **Rate Controls:** SlowAPI endpoint blocks limiting traffic to 10 requests/min per IP.
- **Payment Verification:** Webhook signatures checked via HMAC-SHA256 of payload.
- **DPDP Act Compliance:** User records are hashed and stored locally; PII is scrubbed using Presidio before LLM queries.

## Verbatim Disclaimer

This application uses publicly available AI models/datasets sourced via AIKosh (aikosh.indiaai.gov.in), an AI repository maintained by IndiaAI under the Ministry of Electronics & Information Technology, Government of India. Ayojit Intelligence is an independent product and is not affiliated with, endorsed by, or sponsored by AIKosh, IndiaAI, or the Government of India.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details. For inquiries, contact Ashwini Kumar Tarai at `tarai.ashwinikumar@gmail.com`.
