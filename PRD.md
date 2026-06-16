# Product Requirements Document (PRD) — Ayojit 5-App Suite

## 1. Overview & Vision
Ayojit Intelligence is building a suite of 5 functional, high-value AI-powered applications utilizing open datasets and models sourced from **AIKosh (aikosh.indiaai.gov.in)**, a Government of India repository. 

Our goal is to launch a suite that solves real problems for Indian citizens, farmers, businesses, and government departments while remaining 100% free-tier hosted. 

---

## 2. Shared Core System (Ayojit Core)
All 5 applications sit behind a unified workspace core.
- **Unified Login:** Supabase Auth (Email/Password + Magic Link + Google Login).
- **Billing Portal:** Razorpay integration to handle subscription upgrades and single-pay orders.
- **Quota Tracking:** A centralized `usage_logs` database table enforcing daily request counts.
- **Global Dashboard:** A Neo-Brutalism styled web hub listing user stats, current usage, and click-through options for all 5 apps.

---

## 3. Product Specifications

### App 1: Kisan Voice AI (`/apps/kisan-voice-ai`)
- **Core Value:** Voice-based farming assistant operating in 22 regional Indian languages.
- **Target Audience:** Indian farmers and state agriculture departments (B2G contract model).
- **Core Flow:** Incoming phone call (Twilio) -> Speech-to-Text translation (Bhashini API) -> KCC Transcript retrieval (RAG via ChromaDB) -> Text-to-Speech regional translation (Bhashini) -> Response played back to caller.
- **Monetization:** Free to use for citizens. Monetized via custom B2G contracts with state governments. Shows a "Request a Government Pilot" Call to Action (CTA) on the admin dashboard.
- **Free Limit:** Unlimited.

### App 2: PinAI (`/apps/pinai`)
- **Core Value:** Hyperlocal business intelligence and demographic scoring based on pincodes.
- **Target Audience:** Small business owners, retailers, NBFCs for credit scoring.
- **Core Flow:** User enters 6-digit pincode -> SQLite query extracts census polygons, pincode directory, and Aadhaar population proxies -> LLM (Claude Haiku) generates 3-sentence retail business recommendations.
- **Monetization:** ₹299/month subscription for unlimited queries.
- **Free Limit:** 5 queries/day.

### App 3: DocPatram (`/apps/docpatram`)
- **Core Value:** Document parsing and translation tailored specifically to Indian government forms.
- **Target Audience:** Citizens, legal agents, and B2G tenders (e.g., pension portals).
- **Core Flow:** File upload -> AIKosh ARX PII Anonymization -> Tesseract regional OCR translation -> BharatGen Patram-7B Vision LLM parsing -> Structured JSON download.
- **Monetization:** ₹999/month subscription for unlimited documents.
- **Free Limit:** 10 documents/day.

### App 4: VaadVivaad (`/apps/vaadvivaad`)
- **Core Value:** Fast AI-mediated dispute resolution for MSME business conflicts.
- **Target Audience:** Indian MSME sellers (marketplaces, B2B traders).
- **Core Flow:** Complainant files dispute -> Shareable ID generated -> Respondent submits statement -> Sarvam-105B Reasoning LLM evaluates statements and MSME Act rules -> AI Mediation Order report (PDF) generated.
- **Monetization:** ₹499 per dispute (one-time fee).
- **Free Limit:** First dispute free.

### App 5: HindiDiff (`/apps/hindidiff`)
- **Core Value:** Hindi text-to-image generator built for Indian content creators.
- **Target Audience:** Local content creators, social media marketers.
- **Core Flow:** Hindi/Hinglish prompt entered -> Bhashini prompt translation to Hindi -> cup-punjab/Baaz-v1 image generation -> Cloudinary storage -> Social download/share.
- **Monetization:** ₹99/month subscription for unlimited images.
- **Free Limit:** 10 images/day.

---

## 4. Attribution & Legal Compliance
- **verbatim Footer Disclaimer:**
  > This application uses publicly available AI models/datasets sourced via AIKosh (aikosh.indiaai.gov.in), an AI repository maintained by IndiaAI under the Ministry of Electronics & Information Technology, Government of India. Ayojit Intelligence is an independent product and is not affiliated with, endorsed by, or sponsored by AIKosh, IndiaAI, or the Government of India.
- **Strict Brand Constraints:** No usage of official government seals, Ashoka emblems, or implying backing of MeitY/IndiaAI. Use clear attribution badges.
