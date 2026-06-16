# Step-by-Step Implementation Plan (ImplementationPlan.md) — Ayojit 5-App Suite

## Step 1: Shared Database & Profile Set Up
1. Create a Supabase Project.
2. Execute the schema queries in `Schema.md` to configure tables, indexes, and Row Level Security (RLS) policies.
3. Verify that the auth setup works correctly by creating a test user.

## Step 2: Next.js Portal & Unified Dashboard
1. Initialize Next.js 14 project using App Router.
2. Build the basic dashboard route `/dashboard` with Neo-Brutalism styling (thick borders, high-contrast colors, strong shadows).
3. Connect the frontend client to Supabase for User Login, Registration, and Sign-out.
4. Render the 5 application cards showing the current daily quota limits (dynamically reading from the database).

## Step 3: Billing Layer & Quota Enforcement
1. Implement `core/auth.py` in the shared FastAPI backend layer:
   - Supabase JWT decoding/validation.
   - Usage check (`get_today_usage`) and usage logging (`increment_usage`).
   - Dependency factory (`enforce_quota`) to intercept backend calls and return HTTP 429 when limits are reached.
2. Build the shared Razorpay endpoints (`core/billing.py`):
   - `/create-subscription/{app_id}` to generate a checkout session.
   - `/webhook` to listen to payment notifications and update `subscriptions` table.
3. Build the Next.js `/apps/{app_id}/billing` route containing the Razorpay checkout script.

## Step 4: App 5 — HindiDiff (Inference Offloaded)
1. Write a `Dockerfile` for Hugging Face Spaces containing cup-punjab/Baaz-v1 Stable Diffusion pipeline using `diffusers` library. Deploy to HF Space.
2. Implement thin FastAPI backend on Render.com:
   - `/generate` route: Validates prompt length -> Normalizes prompt -> Makes HTTP call to HF Space -> Uploads output image to Cloudinary -> Writes generation history to database -> Increments quota.
3. Build `/apps/hindidiff` Next.js frontend with prompt text box, style/size dropdown selectors, and "My Gallery" view.

## Step 5: App 2 — PinAI
1. Set up SQLite database from AIKosh CSVs (All India Pincode Directory + Aadhaar Update).
2. Implement backend endpoint `/query`:
   - Validates pincode format (6 digits).
   - Queries metrics using safe SQLite session logic.
   - Summarizes business recommendations using Claude Haiku API.
3. Build Next.js frontend with search interface and rating indicator.

## Step 6: App 3 — DocPatram
1. Deploy Patram-7B Instruct model to Hugging Face Spaces as a REST endpoint.
2. Implement backend `/extract` endpoint on Render.com:
   - Accept PDF/PNG/JPG uploads (max 10MB).
   - Apply Tesseract OCR for text extraction.
   - Run Presidio/ARX to scrub PII.
   - Call HF Space Patram-7B API to retrieve JSON fields.
3. Build Next.js frontend with drag-and-drop file upload, extraction preview, and history download list.

## Step 7: App 4 — VaadVivaad
1. Implement backend `/dispute/file` and `/dispute/respond` endpoints:
   - File dispute: Save metadata to SQLite. First filing is free, subsequent ones check Razorpay payment token.
   - Respond: Add respondent statement and trigger Sarvam-105B API to evaluate claims.
   - Mediation: Generate a structured PDF using `reportlab`.
2. Build Next.js frontend: Filing Form, shareable Response page, and status tracking tab.

## Step 8: App 1 — Kisan Voice AI
1. Implement Twilio `/voice/inbound` and `/voice/process` endpoints:
   - Verify incoming Twilio webhook signatures.
   - Transcribe incoming audio using Bhashini API.
   - Retrieve KCC RAG context from ChromaDB.
   - Synthesize response using Bhashini TTS and play it back to caller.
2. Build Admin dashboard route listing call logs and resolution rates.
