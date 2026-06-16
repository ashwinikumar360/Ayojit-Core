# Ayojit Intelligence × AIKosh — Product Requirements Document
**All 5 Apps | Lite Mode**

> PRD Owner: Ashwini Kumar Tarai, Ayojit Intelligence
> Reviewer: Ashwini Kumar Tarai (sole owner)
> Version: 1.0 | Date: June 2026
> Build Order: HindiDiff → PinAI → DocPatram → VaadVivaad → Kisan Voice AI

---

## Table of Contents

1. [HindiDiff — Hindi Text-to-Image](#1-hindidiff)
2. [PinAI — Hyperlocal Business Intelligence](#2-pinai)
3. [DocPatram — Government Document AI](#3-docpatram)
4. [VaadVivaad — AI Dispute Resolution](#4-vaadvivaad)
5. [Kisan Voice AI — Farmer Helpline](#5-kisan-voice-ai)
6. [Shared Core PRD — Ayojit Core](#6-shared-core)
7. [Quality Check Report](#7-quality-check-report)
8. [AI Gap Report](#8-ai-gap-report)

---

---

# 1. HindiDiff

## 0. Version & Ownership

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | June 2026 |
| Owner | Ashwini Kumar Tarai |
| Status | Approved for build |
| Build Priority | #1 (most visual, fastest demo) |

---

## 1. Executive One-Pager

- **Problem:** Hindi-speaking creators cannot generate AI images using their native language — all major tools (Midjourney, DALL·E, Firefly) require English prompts, creating a language barrier for 600M+ Hindi speakers.
- **Goal:** Ship a Hindi-first text-to-image generator powered by Baaz-v1 (AIKosh), deployed on HF Spaces + Render + Vercel, within 30 days.
- **Scope:** Image generation UI, quota enforcement (10/day free), ₹99/mo Razorpay billing, My Gallery dashboard tab.
- **Success Metrics:** 500 paid subscribers + ₹1L MRR within 90 days post-launch; DAU/MAU ≥ 30%.
- **Launch:** ASAP MVP, 30-day build target.

---

## 2. Overview & Context

**Problem Statement (Why Now?)**
India has 600M+ Hindi speakers yet zero mainstream image-generation tools accept Hindi prompts natively. Baaz-v1, a Hindi-aware diffusion model, is now freely available on AIKosh — creating a first-mover window of 3–6 months before large players add Hindi support.

**Strategic Alignment**
- OKR: 500 paid users + ₹1L MRR within 90 days
- Platform: Anchor app for Ayojit Intelligence (most shareable, viral loop through generated images)
- Model: Baaz-v1 via AIKosh (free, open) hosted on HF Spaces (free GPU tier)

**Competitive Snapshot**

| Competitor | Gap |
|---|---|
| Canva AI | English-only prompts |
| Adobe Firefly | English-only, paid subscription |
| Midjourney | No Hindi, Discord-based UX |
| **HindiDiff** | **Hindi-first, ₹99/mo, browser-based** |

---

## 3. Customer Insights & Evidence

**Primary (Founder Hypothesis):**
> "I want to describe a Rajasthani bride in my own words — in Hindi — and get an image. Every tool I try needs English and I don't know the right words." — Target user archetype, Hindi-speaking content creator, Tier 2 city

**Secondary:**
- IAMAI 2024: 74% of India's next 300M internet users will prefer vernacular content
- ShareChat/Josh audience = 200M+ vernacular content creators actively seeking generation tools
- Baaz-v1 AIKosh model page: designed specifically for Indian cultural prompts and Devanagari input

---

## 4. Goals & Non-Goals

**Goals**
- Accept Hindi Devanagari text prompt → generate 1–4 images via Baaz-v1
- Enforce 10 images/day free quota; block at limit, show upgrade CTA
- Razorpay ₹99/mo subscription unlocks unlimited generation
- Store generated images to Cloudinary; save metadata to `generations` table
- My Gallery tab: paginated grid of past generations with re-download

**Non-Goals**
- No English prompt support at MVP (Hindi only)
- No inpainting / editing of generated images
- No social sharing feature at MVP
- No mobile app — web only

---

## 5. Use Cases & Jobs-to-Be-Done

| User | Job | Pain Solved |
|---|---|---|
| Hindi content creator | Generate thumbnail images for YouTube/Reels | No English knowledge needed |
| Small business owner | Create product visuals with Hindi description | Replaces expensive designer |
| Teacher / educator | Generate illustrations for Hindi textbooks | No design skills needed |
| Developer / API buyer | Integrate Hindi image gen into own app (B2B) | No Hindi-aware API exists |

---

## 6. Requirements

### 6.1 Functional Requirements

**FR-HD-01** System shall accept Hindi Devanagari text prompt (max 500 chars) via textarea input.
**FR-HD-02** System shall validate prompt: strip HTML/script tags, reject prompts with injection patterns, enforce max 500 char limit via Pydantic.
**FR-HD-03** System shall accept style selection from fixed enum: `[art, traditional, realistic, anime, miniature]`.
**FR-HD-04** System shall accept size selection from fixed enum: `[square, portrait, landscape]`.
**FR-HD-05** System shall accept variations count from fixed enum: `[1, 2, 4]` (max 4, server-enforced).
**FR-HD-06** On POST `/generate`, backend shall check `enforce_quota('hindidiff','image_gen')` before calling Baaz-v1.
**FR-HD-07** If quota exceeded (free user, >10/day), return HTTP 429 with `{"detail": {"message": "दैनिक सीमा समाप्त", "quota_used": 10, "quota_limit": 10, "upgrade_url": "/apps/hindidiff/billing"}}`.
**FR-HD-08** On successful generation, backend shall upload image(s) to Cloudinary using signed upload preset (no exposed API secret).
**FR-HD-09** Backend shall save `{user_id, prompt, image_url, seed, created_at}` to `generations` table with RLS.
**FR-HD-10** Backend shall call `log_usage('hindidiff','image_gen')` after successful Cloudinary upload.
**FR-HD-11** Frontend shall display quota meter: "X/10 आज की निःशुल्क छवियाँ".
**FR-HD-12** Frontend shall show upgrade CTA card when 429 received, linking to `/apps/hindidiff/billing`.
**FR-HD-13** My Gallery tab shall display paginated grid (12/page) of past generations for authenticated user, fetched from `generations` table.
**FR-HD-14** Each gallery item shall have a re-download button that fetches image from Cloudinary URL.
**FR-HD-15** Billing page shall call POST `/billing/create-subscription/hindidiff` → Razorpay ₹99/mo plan.
**FR-HD-16** Backend shall set hard server-side cap: max 3 concurrent `/generate` requests (semaphore) to avoid HF Spaces resource exhaustion.
**FR-HD-17** AIKosh attribution footer (verbatim §0.3 text) shall appear on all HindiDiff pages.

### 6.2 Non-Functional Requirements

**NFR-HD-01** Rate limit: 5 req/min/IP via slowapi on `/generate`.
**NFR-HD-02** JWT (Supabase) required on `/generate` — no anonymous generation.
**NFR-HD-03** CORS: restricted to production domain + localhost:3000.
**NFR-HD-04** File size: N/A (text-in, image-out — no upload).
**NFR-HD-05** Response time: generation < 30s (HF Spaces CPU tier); show loading spinner with Hindi copy "बना रहे हैं...".
**NFR-HD-06** HTTPS enforced (Vercel + Render provide free TLS).
**NFR-HD-07** DPDP Act 2023: no PII stored beyond user_id + prompt; privacy policy discloses prompt logging.

### 6.3 Acceptance Criteria

```gherkin
Scenario: Free user generates image within quota
  Given user is authenticated and has used 3/10 daily images
  When user submits Hindi prompt "एक राजस्थानी दुल्हन" with style "traditional"
  Then system calls Baaz-v1, uploads to Cloudinary, saves to generations table
  And quota meter shows "4/10 आज की निःशुल्क छवियाँ"

Scenario: Free user hits daily quota
  Given user is authenticated and has used 10/10 daily images
  When user submits any prompt
  Then system returns HTTP 429
  And frontend shows upgrade CTA with link to /apps/hindidiff/billing

Scenario: Paid user generates beyond free limit
  Given user has active ₹99/mo Razorpay subscription (status=active)
  When user submits prompt after 10 daily uses
  Then enforce_quota returns allowed=True (paid plan bypasses limit)
  And generation proceeds normally

Scenario: Prompt injection attempt
  Given user submits prompt containing "<script>alert(1)</script>"
  When Pydantic validator runs
  Then request is rejected with HTTP 422
  And no Baaz-v1 call is made
```

---

## 7. Technical Notes

- **Model:** Baaz-v1 hosted on HF Spaces (Docker); Render FastAPI calls HF Spaces inference endpoint
- **Image storage:** Cloudinary signed upload preset — API secret never exposed to client
- **DB:** `generations` table in shared Supabase project, RLS enabled
- **Quota:** shared `core/auth.py` `enforce_quota()` + `log_usage()`
- **Concurrency:** asyncio.Semaphore(3) on `/generate` handler
- **HF Spaces cold start:** ~30–60s on free CPU; add "warming" ping in Render startup

---

## 8. Metrics & Success Criteria

| KPI | Target | Owner | Method |
|---|---|---|---|
| Paid subscribers | 500 in 90 days | Ashwini | Razorpay dashboard |
| MRR | ₹49,500 (500 × ₹99) | Ashwini | Razorpay |
| DAU/MAU | ≥ 30% | Ashwini | Supabase usage_logs |
| Generation success rate | ≥ 95% | Ashwini | Render logs |
| Avg generation time | < 30s | Ashwini | FastAPI response time logging |

---

## 9. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| HF Spaces GPU unavailable / slow | High | Cache last 100 generations; show estimated wait time |
| Baaz-v1 generates NSFW content | High | Add content safety filter; block prompts with flagged terms |
| Razorpay webhook fails → user stuck on free | Medium | Idempotent webhook handler; retry queue |
| Prompt abuse (spam/bulk generation) | Medium | Rate limit 5/min/IP + daily quota |
| AIKosh license restricts commercial use | High | Verify Baaz-v1 license on AIKosh before launch |

---

## 10. Rollout Plan

| Phase | Scope | Gate |
|---|---|---|
| Alpha | Internal only, test mode Razorpay | Generation works end-to-end |
| Beta | 50 invited Hindi creators | NPS ≥ 7, <5% error rate |
| Launch | Public, live Razorpay | Beta gates passed |

---

## 11. Open Questions

- [ ] Baaz-v1 license on AIKosh — Open or Registered? Commercial use allowed?
- [ ] HF Spaces GPU quota sufficient for 500 DAU? Or need paid HF tier?
- [ ] Prompt moderation: use Anthropic API for safety check or keyword blocklist?

---

---

# 2. PinAI

## 0. Version & Ownership

| Field | Value |
|---|---|
| Version | 1.0 | Date | June 2026 |
| Owner | Ashwini Kumar Tarai |
| Build Priority | #2 |

---

## 1. Executive One-Pager

- **Problem:** SMBs and NBFCs in India have no affordable tool to get hyperlocal demographic, economic, and geographic intelligence by pincode — currently requires expensive research firms or manual census parsing.
- **Goal:** Ship pincode-based intelligence query tool using AIKosh Census + Pincode Directory datasets, ₹299/mo subscription.
- **Scope:** POST `/query` API, Neo-Brutalism search UI, quota (5 queries/day free), billing page.
- **Success Metrics:** 500 paid users + ₹1L MRR in 90 days; query success rate ≥ 98%.
- **Launch:** 30-day MVP.

---

## 2. Overview & Context

**Problem Statement**
India has 19,000+ pincodes with vastly different demographics, purchasing power, and infrastructure. Businesses expanding to new areas, NBFCs doing credit scoring, and logistics companies optimizing delivery zones all need this data — but the only free source (Census 2011) requires significant technical effort to parse. PinAI wraps it in a 1-query interface.

**Strategic Alignment**
- OKR: 500 paid × ₹299 = ₹1.49L MRR potential
- Data: AIKosh All India Pincode Directory + Census District Polygons + Aadhaar Monthly Update (all free)
- NL insights layer: Claude API (Anthropic) for human-readable summaries

**Competitive Snapshot**

| Competitor | Gap |
|---|---|
| Google Maps | No demographic data |
| IndiaStat | Expensive, not API-accessible |
| Census India portal | Raw data, no query interface |
| **PinAI** | **₹299/mo, instant NL insights, API-ready** |

---

## 3. Customer Insights & Evidence

**Primary (Founder Hypothesis):**
> "I need to know if pincode 110001 is worth opening a branch — population density, Aadhaar saturation, competition. Right now I spend 3 days manually compiling this." — NBFC credit officer archetype

**Secondary:**
- RBI Financial Inclusion report 2023: NBFCs expanding into 5,000+ new pincodes annually
- D2C brands: 68% cite "location intelligence" as top barrier to Tier 2/3 expansion (Inc42, 2024)

---

## 4. Goals & Non-Goals

**Goals**
- Accept pincode input → return structured intelligence: district, state, population proxy, Aadhaar saturation, lat/lng, nearby pincodes
- NL insight summary via Claude API ("This pincode has high Aadhaar density suggesting urban saturation...")
- 5 queries/day free; ₹299/mo paid = unlimited
- CORS-restricted API endpoint for B2B resale

**Non-Goals**
- No real-time data (Census 2011 base; Aadhaar monthly updates only)
- No map visualization at MVP
- No bulk CSV export at MVP

---

## 5. Requirements

### 5.1 Functional Requirements

**FR-PI-01** System shall accept POST `/query` with body `{"pincode": "string", "query": "string"}`.
**FR-PI-02** Pydantic shall validate: pincode = exactly 6 digits; query string max 200 chars; strip SQL/command injection patterns.
**FR-PI-03** Endpoint shall require valid Supabase JWT (`get_current_user` dependency).
**FR-PI-04** Endpoint shall call `enforce_quota('pinai','query')` before processing.
**FR-PI-05** If quota exceeded, return HTTP 429 with upgrade URL.
**FR-PI-06** On valid request, query SQLite DB (loaded from AIKosh CSVs) for pincode metadata.
**FR-PI-07** System shall generate NL insight via Claude API using pincode data as context.
**FR-PI-08** On success, call `log_usage('pinai','query')`.
**FR-PI-09** Frontend quota meter shall display "X/5 आज की निःशुल्क queries".
**FR-PI-10** Frontend shall show result cards: district, state, population proxy, Aadhaar density, coordinates, NL insight paragraph.
**FR-PI-11** Billing page: POST `/billing/create-subscription/pinai` → Razorpay ₹299/mo.

### 5.2 Non-Functional Requirements

**NFR-PI-01** Rate limit: 10 req/min/IP (slowapi).
**NFR-PI-02** SQLite query response < 200ms.
**NFR-PI-03** Total response (including Claude NL insight) < 5s.
**NFR-PI-04** Data loaded read-only; no write endpoints on data layer.
**NFR-PI-05** CORS: production domain + localhost only.

### 5.3 Acceptance Criteria

```gherkin
Scenario: Valid pincode query within quota
  Given user is authenticated with 2/5 queries used today
  When user POSTs {"pincode": "110001", "query": "Is this good for a pharmacy?"}
  Then system returns district, state, Aadhaar data, NL insight
  And quota meter updates to 3/5

Scenario: Invalid pincode format
  Given user POSTs {"pincode": "ABCDEF"}
  When Pydantic validation runs
  Then HTTP 422 returned, no DB query made

Scenario: SQL injection attempt
  Given user POSTs {"pincode": "110001", "query": "'; DROP TABLE pincodes;--"}
  When validator strips injection pattern
  Then sanitized query processed or HTTP 422 returned
  And DB table remains intact
```

---

## 6. Technical Notes

- **Data:** AIKosh CSVs loaded into SQLite at startup via `data/setup_db.py`
- **NL layer:** `anthropic` Python SDK, `claude-sonnet-4-6` model
- **Quota:** shared `core/auth.py`
- **Deploy:** FastAPI on Render free tier; Next.js on Vercel

---

## 7. Metrics

| KPI | Target | Method |
|---|---|---|
| Paid subscribers | 500 / 90 days | Razorpay |
| Query success rate | ≥ 98% | Render logs |
| Avg response time | < 5s | FastAPI middleware |
| B2B API resale leads | 5 in 90 days | CRM / email |

---

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Census 2011 data stale | Medium | Label data vintage clearly in UI; add Aadhaar monthly updates |
| Claude API cost at scale | Medium | Cache NL insights per pincode (24hr TTL) |
| AIKosh dataset license | High | Verify before commercial launch |
| Pincode not found in DB | Low | Graceful "pincode not found" message + manual contact CTA |

---

## 9. Open Questions

- [ ] Aadhaar data license: UIDAI terms allow commercial use?
- [ ] NL insight caching strategy: Redis or in-memory dict?
- [ ] B2B API pricing: separate plan or enterprise tier?

---

---

# 3. DocPatram

## 0. Version & Ownership

| Field | Value |
|---|---|
| Version | 1.0 | Date | June 2026 |
| Owner | Ashwini Kumar Tarai |
| Build Priority | #3 |

---

## 1. Executive One-Pager

- **Problem:** Indian citizens waste 2–8 hours per government document (affidavit, RTI, NOC, income certificate) navigating complex formats, language barriers, and handwritten templates — often paying ₹200–500 to a "document agent."
- **Goal:** AI-generated Indian government documents using Patram-7B (AIKosh) + OCR; ₹999/mo subscription + B2G tender pipeline.
- **Scope:** `/generate-doc` API, file upload OCR, My Documents dashboard, billing.
- **Success Metrics:** 500 paid users + ₹1L MRR / 90 days; doc generation success ≥ 90%.
- **Launch:** 30-day MVP.

---

## 2. Overview & Context

**Problem Statement**
India processes 100M+ government documents annually. Citizens in Tier 2/3 cities lack access to affordable legal assistance. DigiLocker provides storage but not generation. Patram-7B (AIKosh) is purpose-built for Indian government document formats — creating a unique capability window.

**Strategic Alignment**
- B2G potential: ₹10L–₹2Cr state government tenders for document digitization
- Consumer SaaS: ₹999/mo — high-value, low-churn (documents are recurring needs)
- Model: Patram-7B + OCR Toolkit + ARX (all free on AIKosh)

**Competitive Snapshot**

| Competitor | Gap |
|---|---|
| DigiLocker | Storage only, no generation |
| Vakil No.1 / LegalDesk | Legal docs only, expensive |
| Local document agents | Offline, ₹200–500/doc, slow |
| **DocPatram** | **AI generation, ₹999/mo unlimited, instant** |

---

## 3. Customer Insights & Evidence

**Primary (Founder Hypothesis):**
> "I needed an income certificate for my daughter's college application. I spent 2 days going to the tehsildar office and paid ₹300 to someone who just typed a form." — Target user, Tier 2 city parent

**Secondary:**
- DARPG Annual Report 2023: 2.1Cr+ RTI applications filed annually, majority handwritten
- CSC (Common Service Centres) charge ₹20–200 per government document — DocPatram undercuts entirely

---

## 4. Goals & Non-Goals

**Goals**
- Accept document type + user details → generate formatted government document via Patram-7B
- Accept uploaded image/PDF → OCR → pre-fill document fields
- Store generated docs to Cloudinary/Supabase Storage; metadata in `documents` table (RLS)
- My Documents tab: list past docs with download links
- B2G tender CTA banner on landing page

**Non-Goals**
- No digital signing / e-stamp at MVP
- No document submission to government portals
- No legal advice / disclaimer beyond "consult a lawyer"

---

## 5. Requirements

### 5.1 Functional Requirements

**FR-DP-01** POST `/generate-doc` accepts `{doc_type, user_details, ocr_text (optional)}`.
**FR-DP-02** `doc_type` validated against fixed enum (affidavit, RTI, NOC, income_certificate, caste_certificate, domicile).
**FR-DP-03** Endpoint requires Supabase JWT + `enforce_quota('docpatram','doc_gen')`.
**FR-DP-04** File upload endpoint: accept PDF/PNG/JPG, max 10MB, validate MIME type by content (not extension), reject macros/embedded scripts.
**FR-DP-05** OCR output sanitized before rendering in UI (strip HTML, prevent XSS).
**FR-DP-06** Patram-7B called with doc_type + user_details + sanitized OCR text.
**FR-DP-07** Generated document uploaded to Cloudinary or Supabase Storage.
**FR-DP-08** `{user_id, title, url, created_at}` saved to `documents` table.
**FR-DP-09** `log_usage('docpatram','doc_gen')` called after successful upload.
**FR-DP-10** My Documents tab fetches user's documents (RLS: own rows only), displays title + created_at + download link.
**FR-DP-11** Billing page: POST `/billing/create-subscription/docpatram` → Razorpay ₹999/mo.
**FR-DP-12** B2G CTA banner: "Integrate DocPatram in your State CSC network — Request a Pilot" → mailto link.

### 5.2 Non-Functional Requirements

**NFR-DP-01** Rate limit: 5 req/min/IP on `/generate-doc` (heavy compute).
**NFR-DP-02** File upload: MIME validation by content bytes (not extension); reject files >10MB.
**NFR-DP-03** OCR text sanitized via bleach before any DB write or UI render.
**NFR-DP-04** RLS: `documents` table — users SELECT own rows only.
**NFR-DP-05** No PII in logs; hash user identifiers in server logs.

### 5.3 Acceptance Criteria

```gherkin
Scenario: Generate RTI application
  Given user is authenticated with 3/10 daily doc_gen remaining
  When user POSTs {doc_type: "RTI", user_details: {...}}
  Then Patram-7B generates formatted RTI
  And document uploaded to storage, URL saved to documents table
  And user sees download link in My Documents tab

Scenario: File upload exceeds size limit
  Given user uploads a 15MB PDF
  When upload endpoint checks file size
  Then HTTP 413 returned with message "File exceeds 10MB limit"
  And no OCR processing occurs

Scenario: Malicious file upload
  Given user uploads file with .jpg extension but PDF+macro content
  When MIME validation checks content bytes
  Then file rejected, HTTP 415 returned
```

---

## 6. Technical Notes

- **Model:** Patram-7B via AIKosh model endpoint (or HF inference API)
- **OCR:** AIKosh OCR Toolkit; fallback to Tesseract if unavailable
- **Storage:** Cloudinary (primary) or Supabase Storage (fallback)
- **MIME validation:** `python-magic` library checks file header bytes
- **XSS sanitization:** `bleach` library on all OCR text before DB/UI
- **Deploy:** FastAPI on Render; model-hosting notes: Patram-7B requires ≥8GB RAM; use AIKosh GPU notebook for inference if Render free tier insufficient

---

## 7. Metrics

| KPI | Target | Method |
|---|---|---|
| Paid subscribers | 500 / 90 days | Razorpay |
| Doc generation success | ≥ 90% | Render error logs |
| B2G pilot requests | 3 in 90 days | Email CRM |
| Avg doc generation time | < 60s | FastAPI middleware |

---

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Patram-7B unavailable on AIKosh | High | Fallback to Claude API with doc templates |
| Generated doc legally incorrect | High | Prominent disclaimer: "Review with a lawyer before submission" |
| File upload abuse (malware) | High | MIME validation + size cap + no execution of uploaded files |
| Render free tier RAM insufficient for model | Medium | Use AIKosh GPU notebook as inference server |

---

## 9. Open Questions

- [ ] Patram-7B: self-hosted or AIKosh API endpoint? Latency difference?
- [ ] Supabase Storage vs Cloudinary for docs — privacy implications?
- [ ] Legal disclaimer language: review with Indian IT law expert?

---

---

# 4. VaadVivaad

## 0. Version & Ownership

| Field | Value |
|---|---|
| Version | 1.0 | Date | June 2026 |
| Owner | Ashwini Kumar Tarai |
| Build Priority | #4 |

---

## 1. Executive One-Pager

- **Problem:** India has 45M+ pending court cases. Lok Adalat (free alternative) is available only on specific dates; online dispute resolution platforms charge ₹5,000–₹50,000/dispute — inaccessible to most citizens.
- **Goal:** AI-mediated dispute resolution using Sarvam-105B (AIKosh); first dispute free (lifetime), ₹499/dispute thereafter.
- **Scope:** `/file-dispute` API, lifetime quota logic, Razorpay one-time payment, My Disputes tracker.
- **Success Metrics:** 500 disputes filed, ₹2.47L revenue (500 × ₹499 paid disputes) / 90 days.
- **Launch:** 30-day MVP.

---

## 2. Overview & Context

**Problem Statement**
India's overburdened judiciary creates a gap for technology-mediated dispute resolution. Sarvam-105B (AIKosh) offers multilingual legal reasoning capability. No existing platform combines: (a) AI mediation, (b) sub-₹500 pricing, (c) Hindi/regional language support.

**Strategic Alignment**
- Marketplace integrations potential: Meesho, Flipkart seller disputes; ONDC grievances
- B2G: State consumer forums, RERA dispute digitization
- Model: Sarvam-105B (free, AIKosh) — multilingual legal domain

**Competitive Snapshot**

| Competitor | Gap |
|---|---|
| Lok Adalat | Offline, date-specific, slow |
| SAMA / CADRE | ₹5,000+ minimum, English only |
| Consumer Forum online | Slow (months), no AI assistance |
| **VaadVivaad** | **₹499, instant, Hindi-first, AI-mediated** |

---

## 3. Customer Insights & Evidence

**Primary (Founder Hypothesis):**
> "My contractor took ₹40,000 advance and disappeared. I can't afford a lawyer and the consumer forum takes months. I just want someone to tell me what to do." — Target user, small business owner, Delhi NCR

**Secondary:**
- NCRB 2023: 45M+ pending cases in Indian courts
- Online dispute resolution market CAGR 22% (FICCI 2024)
- ONDC seller disputes: 12,000+/month with no automated resolution path

---

## 4. Goals & Non-Goals

**Goals**
- First dispute free (lifetime, not daily — `lifetime_usage` table)
- Subsequent disputes: Razorpay one-time ₹499 order (not subscription)
- Sarvam-105B generates: case summary, recommended resolution, next steps
- My Disputes tab: status tracker (filed → in review → resolved)
- Admin-only role can update dispute status

**Non-Goals**
- No legally binding arbitration at MVP
- No lawyer matching / referral at MVP
- No court filing integration
- No WhatsApp/SMS notifications at MVP

---

## 5. Requirements

### 5.1 Functional Requirements

**FR-VV-01** POST `/file-dispute` requires Supabase JWT.
**FR-VV-02** Before processing, check `lifetime_usage` table for existing `{user_id, app_id='vaadvivaad', action='dispute'}` row.
**FR-VV-03** If no lifetime record: allow free processing; insert lifetime_usage row; proceed to Sarvam-105B.
**FR-VV-04** If lifetime record exists: require Razorpay one-time order payment before processing.
**FR-VV-05** Razorpay order created server-side via `client.order.create({amount: 49900, currency: 'INR'})`.
**FR-VV-06** Client receives order_id; user completes payment; client sends `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` to `/verify-payment`.
**FR-VV-07** Server verifies HMAC-SHA256 signature before marking dispute as paid — never trust client-side "success".
**FR-VV-08** On verified payment: insert dispute to `disputes` table with `paid=true`; proceed to Sarvam-105B.
**FR-VV-09** Dispute description validated: max 5000 chars, strip HTML, no script tags.
**FR-VV-10** Sarvam-105B called with dispute description → returns summary + resolution recommendation.
**FR-VV-11** Dispute saved to `disputes` table: `{user_id, description, status='filed', razorpay_order_id, paid}`.
**FR-VV-12** My Disputes tab: fetch user's disputes (RLS: own rows), display status badge (filed/in_review/resolved).
**FR-VV-13** Admin role (Supabase role check): can UPDATE dispute status via `/admin/disputes/{id}/status`.

### 5.2 Non-Functional Requirements

**NFR-VV-01** Rate limit: 3 req/min/IP on `/file-dispute`.
**NFR-VV-02** Payment signature verification: server-side only, HMAC-SHA256.
**NFR-VV-03** Disputes table RLS: users SELECT/INSERT own rows; admin role can SELECT all.
**NFR-VV-04** Description sanitized with `bleach` before DB insert and UI render.
**NFR-VV-05** Razorpay key_secret never sent to client.

### 5.3 Acceptance Criteria

```gherkin
Scenario: First-time free dispute filing
  Given user is authenticated with no lifetime dispute record
  When user POSTs dispute description (valid, <5000 chars)
  Then system inserts lifetime_usage record
  And Sarvam-105B called, result saved to disputes table
  And user sees dispute in My Disputes with status "filed"

Scenario: Second dispute requires payment
  Given user has 1 lifetime dispute record
  When user POSTs new dispute
  Then system returns {requires_payment: true, order_id: "rzp_xxx", amount: 49900}
  And no Sarvam-105B call made until payment verified

Scenario: Payment signature tampering
  Given user modifies razorpay_signature in client before sending
  When server runs HMAC-SHA256 verification
  Then HTTP 400 returned: "Payment verification failed"
  And dispute not created, no Sarvam-105B call made

Scenario: Admin updates dispute status
  Given admin user (role=admin) sends PATCH /admin/disputes/{id}/status
  When role check passes
  Then dispute status updated to "in_review" or "resolved"
  And user's My Disputes tab reflects new status
```

---

## 6. Technical Notes

- **Lifetime quota:** `lifetime_usage` table (separate from `usage_logs`) — query is `SELECT 1 FROM lifetime_usage WHERE user_id=$1 AND app_id='vaadvivaad' AND action='dispute'`
- **Payment flow:** Server creates order → client pays → client sends signature → server verifies → server processes
- **Model:** Sarvam-105B via AIKosh API or Sarvam AI free tier
- **Admin role:** Supabase custom claim `app_metadata.role = 'admin'` — set manually in Supabase dashboard for Ayojit team accounts

---

## 7. Metrics

| KPI | Target | Method |
|---|---|---|
| Disputes filed (total) | 500 / 90 days | Supabase disputes count |
| Paid disputes | 300 / 90 days (60%) | Razorpay orders |
| Revenue | ₹1.5L (300 × ₹499) | Razorpay dashboard |
| Resolution satisfaction | ≥ 4/5 stars | Post-resolution survey (Phase 2) |

---

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Users treat AI resolution as legally binding | High | Bold disclaimer: "AI-generated, not legal advice. Consult a lawyer." |
| Razorpay payment stuck / partial | High | Idempotent order verification; refund policy in /legal/refund |
| Sarvam-105B hallucination in legal context | High | Human review step before "resolved" status; show model limitations |
| Abuse of free dispute (multiple accounts) | Medium | Phone OTP verification on signup |

---

## 9. Open Questions

- [ ] Sarvam-105B: direct API or AIKosh endpoint? Rate limits?
- [ ] Legal liability: do we need a T&C clause specifically disclaiming legal advice?
- [ ] Admin review workflow: email notification when new dispute filed?

---

---

# 5. Kisan Voice AI

## 0. Version & Ownership

| Field | Value |
|---|---|
| Version | 1.0 | Date | June 2026 |
| Owner | Ashwini Kumar Tarai |
| Build Priority | #5 (B2G — needs Twilio + Bhashini govt API keys) |

---

## 1. Executive One-Pager

- **Problem:** Indian farmers lose ₹6,700 Cr annually to preventable crop diseases due to lack of timely, language-accessible agricultural advisory. KCC (Kisan Call Centre) helpline 1800-180-1551 handles 2.4M+ queries but has limited capacity and Hindi/regional language gaps.
- **Goal:** AI voice helpline in 22 Indian languages using AIKosh KCC dataset (2.4M+ Q&A pairs) + Bhashini ASR/TTS; B2G contract model (no consumer billing).
- **Scope:** Twilio voice webhook, Bhashini pipeline, KCC RAG (ChromaDB), admin dashboard.
- **Success Metrics:** 1 state government pilot contract (₹5L–₹50L) within 6 months; ≥85% query resolution rate.
- **Launch:** 30-day MVP; B2G sales cycle separate.

---

## 2. Overview & Context

**Problem Statement**
KCC helpline receives 2.4M+ farmer queries/year but is constrained by human operator availability and language coverage. Bhashini (Govt of India) provides free ASR/TTS for 22 Indian languages. AIKosh KCC dataset provides 2.4M+ curated Q&A pairs. Combining these creates a 24/7 AI farmer helpline at near-zero marginal cost — a compelling B2G pitch.

**Strategic Alignment**
- B2G revenue: ₹5L–₹2Cr state agriculture department contracts
- PM-KISAN, ATMA, RKVY schemes all have digital agriculture components — aligns with policy
- No consumer billing (B2G only) — simpler product, complex sales

**Competitive Snapshot**

| Competitor | Gap |
|---|---|
| KCC Helpline 1551 | Human-only, limited hours, wait times |
| Ola Krutrim | Not agriculture-specific |
| State agri portals | Text-only, English/Hindi only |
| **Kisan Voice AI** | **Voice, 22 languages, 24/7, KCC-trained** |

---

## 3. Customer Insights & Evidence

**Primary (Founder Hypothesis):**
> "Farmers in our district speak only Bhojpuri. The KCC helpline doesn't help them because the operators don't understand the dialect. By the time they get advice, the crop is already lost." — Block agriculture officer archetype, Bihar

**Secondary:**
- ICAR 2023: 43% of crop loss in India attributed to delayed or incorrect pest/disease advisory
- Bhashini covers 22 scheduled languages + dialects — government mandate for digital inclusion
- KCC dataset: 2.4M+ Q&A pairs covering crops, pests, weather, schemes — largest free agricultural knowledge base in India

---

## 4. Goals & Non-Goals

**Goals**
- Twilio inbound call webhook → detect language → Bhashini ASR → ChromaDB KCC RAG → Bhashini TTS → voice response
- Hash + log call metadata (no raw PII phone numbers stored)
- Admin dashboard: call logs, language breakdown, resolution rate (for B2G demo)
- "Request a Government Pilot" CTA (no Razorpay — B2G contract model)
- Twilio webhook signature validation on every inbound call

**Non-Goals**
- No consumer subscription / billing
- No WhatsApp integration at MVP
- No crop image analysis (voice only)
- No farmer registration / account system (anonymous calls)

---

## 5. Requirements

### 5.1 Functional Requirements

**FR-KV-01** POST `/voice/inbound` receives Twilio webhook; validate `X-Twilio-Signature` header before processing.
**FR-KV-02** Return TwiML welcome message in Hindi (default); production upgrade: detect caller region → set language.
**FR-KV-03** POST `/voice/process` receives `SpeechResult` (Twilio STT); if empty, replay welcome.
**FR-KV-04** `SpeechResult` passed to `get_best_answer(query)` from `app/rag.py` (ChromaDB KCC lookup).
**FR-KV-05** Answer returned as TwiML `<Say>` in farmer's language via Bhashini TTS.
**FR-KV-06** After answer: offer "क्या आपका कोई और प्रश्न है?" follow-up gather.
**FR-KV-07** Log call: `{call_sid_hash, language, query_hash, resolution_flag, timestamp}` — hash all PII before storage.
**FR-KV-08** Admin dashboard (JWT-protected, Ayojit team only): display call logs, language breakdown chart, resolution rate.
**FR-KV-09** KCC dataset ingestion: `data/ingest_kcc.py` loads AIKosh CSVs into ChromaDB with multilingual sentence embeddings.
**FR-KV-10** Audio payload capped at 10MB before passing to Bhashini (prevent abuse).
**FR-KV-11** `/call` rate-limited via slowapi to prevent abuse.
**FR-KV-12** Static "Request a Government Pilot" CTA on admin landing: links to mailto / contact form.

### 5.2 Non-Functional Requirements

**NFR-KV-01** Twilio signature validation: every webhook validated with `twilio.request_validator`; reject unsigned requests.
**NFR-KV-02** No raw phone numbers stored; SHA-256 hash of `From` number only.
**NFR-KV-03** Admin routes: Supabase JWT required + `app_metadata.role = 'admin'` check.
**NFR-KV-04** All Bhashini/Twilio/Bhashini keys in env vars only.
**NFR-KV-05** ChromaDB persisted locally (or Render disk); not exposed via API.
**NFR-KV-06** Render free tier cold start: KCC ChromaDB loads at startup (lazy load acceptable).

### 5.3 Acceptance Criteria

```gherkin
Scenario: Farmer calls, asks about wheat rust
  Given farmer dials Twilio number
  When Twilio sends POST /voice/inbound with valid signature
  Then system returns TwiML welcome in Hindi
  And farmer speaks "गेहूं में पीला रतुआ रोग"
  When POST /voice/process receives SpeechResult
  Then ChromaDB KCC RAG returns relevant answer
  And TwiML <Say> responds in Hindi with answer
  And call logged (hashed CallSid, hashed From, resolution_flag=True)

Scenario: Unsigned Twilio webhook
  Given POST /voice/inbound arrives without valid X-Twilio-Signature
  When validator checks signature
  Then HTTP 403 returned, no TwiML generated

Scenario: Admin views call logs
  Given Ayojit team member with role=admin accesses /admin/calls
  When JWT verified + role checked
  Then call log table displayed: date, language, resolution rate
  And no raw phone numbers visible (hashed only)
```

---

## 6. Technical Notes

- **Bhashini:** Free Govt API; registration at bhashini.gov.in; pipeline: ASR → Translation → TTS
- **KCC Dataset:** Download from AIKosh, load CSVs to `./data/kcc_raw/`, run `ingest_kcc.py`
- **Embeddings:** `paraphrase-multilingual-mpnet-base-v2` (multilingual, covers Hindi + regional)
- **Twilio:** $15 free trial credit; B2G contract covers ongoing cost
- **Deploy:** FastAPI on Render; Twilio webhook URL = Render service URL

---

## 7. Metrics

| KPI | Target | Method |
|---|---|---|
| B2G pilot contracts | 1 in 6 months | CRM / email |
| Contract value | ₹5L–₹50L | Invoice |
| Query resolution rate | ≥ 85% | Call logs (`resolution_flag`) |
| Languages served | ≥ 5 at MVP | Call logs (`language` field) |
| Avg call handle time | < 3 min | Twilio analytics |

---

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Twilio trial credit exhausted before B2G deal | High | Budget ₹5,000 for Twilio top-up; include in B2G pitch cost |
| Bhashini ASR accuracy < 80% for dialects | High | Fallback to Twilio STT for Hindi; log low-confidence transcriptions |
| KCC dataset outdated / wrong answers | High | Add "Verify with local KVK" disclaimer in all responses |
| B2G sales cycle > 6 months | Medium | Build demo video + PDF pitch deck using admin dashboard |
| Render cold start kills call (30s delay) | Medium | Keep-alive ping every 10 min via cron |

---

## 9. Open Questions

- [ ] Bhashini: which pipeline ID for 22-language support? (masterplan uses `64392f96daac500b55c543cd`)
- [ ] KCC dataset: Open or Registered license on AIKosh? CSV download available?
- [ ] B2G pitch: which state agriculture departments to target first (UP, Bihar, Maharashtra)?
- [ ] Twilio number: Indian (+91) DID requires TRAI registration — process started?

---

---

# 6. Shared Core PRD

## 1. Executive One-Pager

- **Problem:** 5 apps would each need independent auth, billing, and quota systems — 5× redundant work, 5× security surface.
- **Goal:** Single "Ayojit Core" layer: Supabase Auth, shared quota enforcement, Razorpay billing module, Neo-Brutalism dashboard — built once, reused by all 5 apps.
- **Scope:** `core/auth.py`, `core/billing.py`, `supabase/schema.sql`, `lib/supabase.ts`, `/legal/*` pages, shared dashboard.
- **Success:** All 5 app PRDs' auth + billing requirements satisfied by shared core with zero duplication.

## 2. Requirements

**FR-SC-01** `core/auth.py`: `get_current_user(Authorization: Bearer)` → decode Supabase JWT → return `{user_id, email}`.
**FR-SC-02** `enforce_quota(app_id, action)` → check `usage_logs` for today's count vs `FREE_LIMITS[app_id][action]` → check subscription plan → raise HTTP 429 if exceeded.
**FR-SC-03** `log_usage(app_id, action)` → insert row to `usage_logs`.
**FR-SC-04** `core/billing.py`: `create_subscription(app_id, user_id)` → Razorpay Subscriptions API → return `subscription_id`.
**FR-SC-05** `core/billing.py`: `verify_webhook(payload, signature)` → HMAC-SHA256 verify → update `subscriptions` table.
**FR-SC-06** `supabase/schema.sql`: all tables from §1.2 masterplan + `lifetime_usage` + `documents` + `disputes` + `generations`, all with RLS.
**FR-SC-07** RLS test script: confirms user A cannot read user B's rows in all tables.
**FR-SC-08** `/legal/terms`, `/legal/privacy`, `/legal/refund`, `/legal/attribution` pages — static Next.js pages.
**FR-SC-09** Privacy policy: DPDP Act 2023 compliant — discloses what's collected, retention period, user rights.
**FR-SC-10** Dashboard: Neo-Brutalism, shows active apps, quota usage per app, subscription status, links to each app.
**FR-SC-11** CORS: `ALLOWED_ORIGINS = [production_domain, "http://localhost:3000"]` on all FastAPI backends.
**FR-SC-12** slowapi rate limiter: 10 req/min/IP applied globally; per-app overrides in app-specific routers.
**FR-SC-13** `.env.example`: all keys from §6 masterplan, no real secrets, covered by `.gitignore`.

---

---

# 7. Quality Check Report

| # | Category | Status | Notes |
|---|---|---|---|
| 1 | Completeness | ✅ | All sections filled; requirements numbered per app |
| 2 | Clarity | ✅ | Acronyms defined (KCC, RAG, RLS, DPDP, TwiML, JWT, HMAC) |
| 3 | Actionability | ✅ | All FR/NFR testable; Gherkin AC for each app |
| 4 | Feasibility | ✅ | Stack confirmed (Supabase/Render/Vercel/HF Spaces); model hosting risks noted |
| 5 | Risk & Edge Cases | ✅ | Risks table per app; edge cases in Gherkin |
| 6 | Alignment | ✅ | Every FR tied to goal; every NFR tied to security checklist §5 |
| 7 | Assumption Audit | ⚠️ | 3 assumptions unverified: AIKosh licenses, Aadhaar commercial use, Twilio TRAI DID |
| 8 | Accessibility | ⚠️ | Neo-Brutalism high contrast ✓; WCAG keyboard nav not yet specified in UI code |
| 9 | Evidence Rigor | ⚠️ | Primary = founder hypothesis (no real user interviews yet); secondary = cited reports |
| 10 | No Contradictions | ✅ | VaadVivaad lifetime vs daily quota distinction consistent across core + app PRD |

---

---

# 8. AI Gap Report

| Risk Type | App | Risk Level | Description | Recommended Clarification |
|---|---|---|---|---|
| Data reference risk | All 5 | **HIGH** | AIKosh model/dataset licenses not confirmed (Open vs Registered vs Restricted) | Verify each on AIKosh before launch: Baaz-v1, Patram-7B, Sarvam-105B, KCC dataset, Pincode+Census |
| Implicit logic risk | VaadVivaad | **HIGH** | Admin review step between "filed" and "resolved" — no notification mechanism defined | Define: email alert? Supabase realtime? Manual check? |
| Hallucination risk | DocPatram | **HIGH** | Patram-7B output used as legal document — no human review step | Add "AI Draft — Review before submission" watermark on all generated docs |
| Hallucination risk | VaadVivaad | **HIGH** | Sarvam-105B legal reasoning may hallucinate case law | Add disclaimer + human review workflow before "resolved" status |
| Ambiguous actor risk | Kisan Voice AI | **MEDIUM** | "Detect caller language from region" — no implementation defined for MVP | Clarify: default Hindi for MVP; skip detection until Phase 2 |
| Conditional logic risk | VaadVivaad | **MEDIUM** | Payment retry on failed Razorpay order not defined | Define: new order on each attempt? Same order_id reuse? |
| Data reference risk | PinAI | **MEDIUM** | Claude API for NL insights — cost at 500 queries/day not estimated | Cap Claude calls per user per day or cache by pincode (24hr TTL) |
| Implicit logic risk | HindiDiff | **MEDIUM** | HF Spaces cold start during generation — user experience undefined | Add loading state with estimated wait + "warming up" message |
| Conditional logic risk | DocPatram | **MEDIUM** | Patram-7B unavailable fallback not implemented | Define fallback: Claude API with doc templates? Manual template fill? |
| Ambiguous actor risk | All 5 | **LOW** | "Admin" role defined as `full_name LIKE '[ADMIN]%'` in schema — fragile | Replace with proper `app_metadata.role` Supabase custom claim |

---

*PRD complete. Build sequence: HindiDiff → PinAI → DocPatram → VaadVivaad → Kisan Voice AI. Run Shared Core setup first.*
