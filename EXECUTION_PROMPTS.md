# Execution Prompts — Run One Per Folder

> Create 5 folders: `kisan-voice-ai/`, `pinai/`, `docpatram/`, `vaadvivaad/`, `hindidiff/`
> Paste the matching prompt into Claude Code (or Claude chat) **inside that folder**, one at a time.
> Each prompt references the two master docs — keep both in the repo root or attach them.

---

## Shared Setup Prompt (run FIRST, in repo root, before any app folder)

```
Read AIKOSH_MVP_MASTERPLAN.md sections 1, 5, and 6.

Build the "Ayojit Core" shared layer in /core and /lib:
- core/auth.py (Supabase JWT verification + quota enforcement, from §1.3)
- core/billing.py (Razorpay subscription + webhook, from §1.4)
- supabase/schema.sql (from §1.2) with RLS enabled on all tables
- lib/supabase.ts (browser client)
- app/dashboard/page.tsx (Neo-Brutalism dashboard, from §1.6)
- /legal/terms, /legal/privacy, /legal/refund, /legal/attribution pages

Apply ALL items in §5 Security Checklist:
- JWT auth on every route, no anonymous writes
- CORS locked to production domain + localhost
- Rate limiting via slowapi (10 req/min/IP)
- Pydantic validation on every input
- Webhook signature verification
- .env.example with no real secrets, .gitignore covers .env
- RLS policies tested (write a quick script that confirms user A cannot read user B's rows)

Output: working code + a README explaining how to run locally and deploy to
Render (backend) and Vercel (frontend) free tiers.
```

---

## 1. Kisan Voice AI — `/kisan-voice-ai`

```
You are inside the kisan-voice-ai/ folder.

Read AIKOSH_MVP_MASTERPLAN.md §3 "App 1" and the original Kisan Voice AI
code in aikosh_mvp_all5.md (Bhashini wrapper, KCC RAG, Twilio voice handler).

Build:
- FastAPI app (app/main.py, app/bhashini.py, app/rag.py, app/voice.py)
- /call webhook for Twilio (no end-user login needed — citizens call a phone number)
- Admin dashboard route (protected by ../core/auth.py get_current_user) showing:
  call logs, language breakdown, resolution rate
- KCC dataset ingestion script (data/ingest_kcc.py) using ChromaDB

Security:
- Validate all Twilio webhook signatures (X-Twilio-Signature header)
- Sanitize and cap audio payload size before passing to Bhashini
- Admin routes require Supabase JWT + role check (only Ayojit team accounts)
- No PII (phone numbers) stored beyond what's needed for the call session;
  hash phone numbers before logging
- Rate-limit /call endpoint (slowapi) to prevent abuse
- All Bhashini/Twilio keys from environment variables only

Add the AIKosh attribution footer (§0.3) to the admin dashboard page.
No Razorpay billing for this app (B2G contract model) — add a static
"Request a Government Pilot" CTA instead.

Output: requirements.txt, Dockerfile, .env.example, README with Render deploy steps.
```

---

## 2. PinAI — `/pinai`

```
You are inside the pinai/ folder.

Read AIKOSH_MVP_MASTERPLAN.md §3 "App 2" and the original PinAI code in
aikosh_mvp_all5.md (Pincode Directory + Census data RAG).

Build:
- FastAPI app with POST /query, wrapped with
  Depends(enforce_quota('pinai','query')) from ../core/auth.py
- After successful response, call log_usage('pinai','query')
- Next.js page app/apps/pinai/page.tsx — Neo-Brutalism search UI:
  search bar, result cards, quota meter "X/5 today", upgrade CTA when 429 received
- Billing page app/apps/pinai/billing/page.tsx calling
  POST /billing/create-subscription/pinai (₹299/mo Razorpay plan)

Security:
- Every /query call requires valid Supabase JWT
- Pydantic model validates query string length (max 200 chars) and strips
  any SQL/command injection patterns before use in RAG lookup
- Rate limit 10 req/min/IP on top of the quota system
- CORS restricted to production + localhost
- Census/Pincode data loaded read-only; no write endpoints exposed

Add AIKosh attribution footer (§0.3) to the page.

Output: requirements.txt, Dockerfile, .env.example, README with Render +
Vercel deploy steps and Razorpay test-mode instructions.
```

---

## 3. DocPatram — `/docpatram`

```
You are inside the docpatram/ folder.

Read AIKOSH_MVP_MASTERPLAN.md §3 "App 3" and the original DocPatram code in
aikosh_mvp_all5.md (Patram-7B + OCR Toolkit + ARX).

Build:
- FastAPI POST /generate-doc, wrapped with
  Depends(enforce_quota('docpatram','doc_gen')) — call log_usage after success
- File upload endpoint for OCR input: enforce max file size (10MB) and
  allowed MIME types (pdf, png, jpg) only
- Store generated documents in Supabase Storage or Cloudinary, save URL +
  metadata to a new "documents" table (id, user_id, title, url, created_at)
  with RLS so users only see their own documents
- Next.js page app/apps/docpatram/page.tsx — Neo-Brutalism upload + generate UI,
  quota meter "X/10 today"
- "My Documents" dashboard tab listing past generations with download links
- Billing page (₹999/mo Razorpay) + B2G tender CTA banner

Security:
- JWT required on all endpoints
- File upload: validate MIME type by content (not just extension), scan for
  embedded scripts/macros before OCR processing, reject anything over 10MB
- Sanitize all extracted OCR text before rendering in UI (prevent XSS)
- Rate limit 5 req/min/IP for /generate-doc (heavier compute)
- Documents table RLS: users can only SELECT their own rows

Add AIKosh attribution footer (§0.3).

Output: requirements.txt, Dockerfile, .env.example, README with Render deploy
steps, including any model-hosting notes for Patram-7B.
```

---

## 4. VaadVivaad — `/vaadvivaad`

```
You are inside the vaadvivaad/ folder.

Read AIKOSH_MVP_MASTERPLAN.md §3 "App 4" and the original VaadVivaad code in
aikosh_mvp_all5.md (Sarvam-105B model for dispute resolution).

Build:
- Add a "lifetime_usage" table (user_id, app_id, action, used_at) separate
  from daily usage_logs, since the free tier is "1 free dispute ever" not daily
- FastAPI POST /file-dispute:
  - check lifetime_usage for existing 'dispute' record
  - if none → allow free, log it
  - if exists → require a Razorpay ONE-TIME order (₹499) via client.order.create(),
    verify payment signature before processing
- Next.js page app/apps/vaadvivaad/page.tsx — Neo-Brutalism dispute filing form
- "My Disputes" dashboard tab — status tracker (filed → in review → resolved),
  RLS so users only see their own disputes

Security:
- JWT required on all endpoints
- Validate Razorpay order payment signature server-side before marking dispute
  as paid/processed — never trust client-side "payment success" alone
- Sanitize all free-text dispute descriptions (max length 5000 chars, strip HTML)
- Rate limit 3 req/min/IP
- Disputes table RLS enabled; admin-only review role for status updates

Add AIKosh attribution footer (§0.3).

Output: requirements.txt, Dockerfile, .env.example, README with Render deploy
steps and Razorpay one-time payment test instructions.
```

---

## 5. HindiDiff — `/hindidiff`

```
You are inside the hindidiff/ folder.

Read AIKOSH_MVP_MASTERPLAN.md §3 "App 5" and the original HindiDiff code in
aikosh_mvp_all5.md (Baaz-v1 model, React generation UI).

Build:
- FastAPI POST /generate, wrapped with
  Depends(enforce_quota('hindidiff','image_gen')) — log_usage after success
- Model call to Baaz-v1 hosted on Hugging Face Spaces (Docker) — backend on
  Render calls the HF Spaces inference endpoint
- Generated images uploaded to Cloudinary; save URL + prompt + seed to a
  "generations" table (id, user_id, prompt, image_url, seed, created_at), RLS enabled
- Reuse/adapt the existing React generation UI (from aikosh_mvp_all5.md) into
  Next.js page app/apps/hindidiff/page.tsx with Neo-Brutalism styling,
  quota meter "X/10 today"
- "My Gallery" dashboard tab — grid of past generations with re-download
- Billing page (₹99/mo Razorpay)

Security:
- JWT required on /generate
- Pydantic validation: prompt max length 500 chars, strip any prompt-injection
  patterns aimed at the model, validate "style"/"size"/"variations" against
  fixed enum/range values (variations max 4)
- Rate limit 5 req/min/IP (image generation is compute-heavy)
- Cloudinary uploads use signed upload presets, not exposed API secrets
- Generations table RLS: users can only SELECT their own rows
- Set a hard server-side cap on concurrent generation requests to avoid
  resource exhaustion on free HF Spaces tier

Add AIKosh attribution footer (§0.3).

Output: requirements.txt, Dockerfile (for HF Spaces), .env.example, README
with HF Spaces + Render + Vercel deploy steps and Razorpay test instructions.
```

---

## Run Order

1. Shared Setup Prompt (repo root)
2. HindiDiff (most visual, fastest demo)
3. PinAI
4. DocPatram
5. VaadVivaad
6. Kisan Voice AI (B2G, no billing — do last, needs Twilio/Bhashini govt API keys)

After each app, run the relevant section of §5 Security Checklist as a
final review pass before moving to the next folder.
