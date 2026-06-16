# Production Deployment Guide

This guide details the step-by-step process to deploy the Ayojit Intelligence product suite to production using free-tier resources.

## Step 1: Database Setup (Supabase)

1. Create a free account at [supabase.com](https://supabase.com) and initialize a new project.
2. In the Supabase Dashboard, navigate to the **SQL Editor**.
3. Copy the contents of `supabase/schema.sql` and run the query. This sets up all tables, indexes, and Row Level Security (RLS) policies.
4. Copy the API keys from project settings (**Settings > API**):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_JWT_SECRET` (Found under JWT Settings)

## Step 2: Model Hosting (Hugging Face Spaces)

To run the custom image and document generation tools:

1. Create an account on [huggingface.co](https://huggingface.co).
2. Create a new **Space** for **Baaz-v1** (HindiDiff model):
   - Select **Docker** as the SDK.
   - Choose the Free CPU basic instance.
   - Upload all files from `apps/hindidiff/huggingface_space/`.
3. Create a second Space for **Patram-7B** (DocPatram model):
   - Choose Docker SDK.
   - Deploy the preconfigured Patram-7B Docker container.
4. Note the Space endpoint URLs (e.g. `https://[username]-[space-name].hf.space`).

## Step 3: Backend Services (Render.com)

Deploy the four FastAPI backend services to [render.com](https://render.com) (choose Web Service, Python language):

1. **Deploy Kisan Voice AI:**
   - Root Directory: `kisan-voice-ai`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
2. **Deploy PinAI:**
   - Root Directory: `pinai`
   - Build/Start commands same as above (running `pinai.backend.main:app`).
3. **Deploy DocPatram:**
   - Root Directory: `docpatram`
   - Build/Start commands same as above (running `docpatram.backend.main:app`).
4. **Deploy VaadVivaad:**
   - Root Directory: `vaadvivaad`
   - Build/Start commands same as above (running `vaadvivaad.backend.main:app`).

Set these environment variables on all Render instances:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_JWT_SECRET`
- `OPENROUTER_API_KEY` (Get from openrouter.ai/keys)
- `HF_TOKEN` (Get from Hugging Face settings)

## Step 4: Payments Configuration (Dodo Payments)

1. Create a developer account on [dodopayments.com](https://dodopayments.com).
2. Add your bank details to enable payouts in INR.
3. Create three monthly subscription products:
   - **PinAI Pro:** ₹299/mo
   - **DocPatram Pro:** ₹999/mo
   - **HindiDiff Pro:** ₹99/mo
4. Create a single product with price override support:
   - **VaadVivaad Dispute Filing:** ₹499 (One-time)
5. Save the product IDs and set them in your backend environments:
   - `DODO_PRODUCT_PINAI`
   - `DODO_PRODUCT_DOCPATRAM`
   - `DODO_PRODUCT_HINDIDIFF`
6. Set up a Webhook endpoint pointing to your main backend billing webhook URL:
   - Endpoint: `https://[your-core-backend]/billing/webhook`
   - Enable events: `subscription.activated`, `subscription.cancelled`, `payment.captured`.
   - Copy the generated `DODO_WEBHOOK_SECRET` and `DODO_API_KEY`.

## Step 5: External API Configurations

1. **Bhashini Language APIs:**
   - Register on the Bhashini portal (bhashini.gov.in) to get your `BHASHINI_API_KEY` and `BHASHINI_USER_ID`.
   - Add these values to the Kisan Voice AI and HindiDiff environments.
2. **Twilio Voice IVR:**
   - Purchase an active phone number on Twilio.
   - Configure the incoming webhook URL under voice configurations to point to your Kisan Voice AI Render URL: `https://[kisan-voice-render-domain]/voice/inbound`.
3. **Sarvam AI:**
   - Register on sarvam.ai to obtain a `SARVAM_API_KEY` for dispute processing.

## Step 6: Frontend Deployment (Vercel)

1. Link your GitHub repository to [vercel.com](https://vercel.com).
2. Set these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (Pointer to the shared backend gateway)
3. Run the Vercel deployment. It will automatically bundle Next.js and host the pages.

## Step 7: End-to-End Checklist

- [ ] Sign up a new user via Vercel frontend. Confirm verification email arrives.
- [ ] Open the dashboard and confirm the user's plan is listed as "FREE".
- [ ] Run 5 queries in PinAI. Verify the 6th query blocks and returns a `429 Quota Exceeded` popup.
- [ ] Click the **Upgrade** CTA, complete a test purchase via the Dodo sandbox checkout, and verify the plan updates to "PRO".
- [ ] Call the Twilio phone number and speak a Hindi query. Verify translation and RAG response are spoken back.
