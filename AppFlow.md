# Application Flow Specification (AppFlow.md) — Ayojit 5-App Suite

## 1. Unified Navigation Layout

```
                        ┌───────────────┐
                        │  Landing Page │
                        └───────┬───────┘
                                │ Login / Sign Up
                                ▼
                       ┌─────────────────┐
                       │ User Dashboard  │
                       └─┬───┬───┬───┬───┘
      ┌──────────────────┘   │   │   │   └──────────────────┐
      ▼                      ▼   ▼   ▼                      ▼
🌾 Kisan Voice AI   📍 PinAI   📄 DocPatram   ⚖️ VaadVivaad   🎨 HindiDiff
```

---

## 2. Shared Core Flows

### 2.1 User Onboarding & Auth
1. **Landing Page:** Highlights the 5 AI tools. Click "Get Started" -> Redirect to `/auth`.
2. **Auth Page (`/auth`):** Supabase login form (email/password or Magic Link).
3. **Registration:** Account creation -> Autocreates a database profile record -> Redirects to `/dashboard`.

### 2.2 Dashboard View (`/dashboard`)
- Displays user profile information.
- Renders 5 cards (one per app) containing:
  - App Icon, Name, and Status Badge (e.g., "FREE" or "PRO").
  - Quota Meter: Progress bar representing today's usage (e.g., "3/10 used").
  - "Open App" Button.
  - "Upgrade" Button (hidden if user is already "PRO" or for Kisan Voice AI).

---

## 3. App-Specific Flows

### 3.1 Kisan Voice AI (`/apps/kisan-voice-ai`)
- **Citizen Voice Call Flow:**
  1. Farmer dials Twilio number.
  2. Twilio triggers webhook `/voice/inbound` -> Returns TwiML welcome message.
  3. Farmer speaks query (e.g., crop disease) -> Twilio records speech and POSTs to `/voice/process`.
  4. Backend runs Bhashini STT -> ChromaDB RAG -> Bhashini TTS.
  5. Audio is played back to the farmer -> Hangup.
- **Admin Dashboard Flow:**
  1. Authenticated user logs in -> Opens Kisan Voice AI Admin dashboard.
  2. View call logs (hashed phone numbers, query transcriptions, detected languages).
  3. Displays call analytics dashboard.

### 3.2 PinAI (`/apps/pinai`)
1. User opens `/apps/pinai`.
2. UI displays a search input, category selector (e.g., retail, pharmacy), and quota meter.
3. User enters a 6-digit pincode -> Clicks "Analyze".
4. If daily quota exceeded: Show Dodo Payments upgrade prompt -> redirect to billing.
5. If quota allowed: Backend performs SQLite lookup -> Claude Haiku consults metrics -> Returns structured JSON.
6. UI displays the rating (e.g., "HIGH POTENTIAL"), a 3-sentence consultancy insight, and nearby business viability stats.

### 3.3 DocPatram (`/apps/docpatram`)
1. User opens `/apps/docpatram`.
2. UI displays an upload zone, document type selector, and "My Documents" list.
3. User uploads file (PDF/PNG/JPG) -> Clicks "Extract".
4. If quota allowed: File uploaded -> OCR extracts text -> ARX anonymizes PII -> Patram-7B processes layout -> Returns structured data.
5. UI displays anonymization stats (e.g., "3 PII items masked") and parsed JSON keys.
6. File URL is stored in user's profile database. User can download the original or JSON output from the list.

### 3.4 VaadVivaad (`/apps/vaadvivaad`)
- **Filing Flow:**
  1. Complainant opens `/apps/vaadvivaad` -> Fills dispute form (Name, statement, amount, respondent details) -> Clicks "File Dispute" (Free for 1st dispute).
  2. Database registers dispute -> Generates Unique ID (e.g., `VV12A4F8`).
  3. UI displays success page with shareable link for Respondent.
- **Response Flow:**
  1. Respondent opens shareable link -> Enter statement.
  2. Submission triggers async Sarvam-105B mediation engine.
  3. Dispute status updates: `waiting_respondent` -> `in_analysis` -> `resolved`.
  4. Both parties view final PDF Mediation Order. Subsequent disputes require ₹499 one-time payment.

### 3.5 HindiDiff (`/apps/hindidiff`)
1. User opens `/apps/hindidiff`.
2. Enter prompt in Hindi or Hinglish -> Select style/size -> Click "Generate".
3. Check daily quota (max 10 free). If limit reached -> Display ₹99 upgrade button.
4. Prompt is normalized -> Passed to Baaz-v1 -> Output uploaded to Cloudinary.
5. UI displays generated image and a "Download" button.
6. "My Gallery" displays past images fetched from user's history.
