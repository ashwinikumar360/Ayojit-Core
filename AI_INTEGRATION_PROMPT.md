# AI Integration Prompt & Guide: Ayojit 5-App Civic Suite 🇮🇳

This document is a specialized, copy-pasteable system instruction file designed for AI coding assistants (such as Antigravity, Cursor, Claude, or GPT) to help you integrate, customize, and make live the **Ayojit Intelligence Civic Suite** on your website.

---

## 🤖 System Prompt for the Integration AI

*Copy and paste the section below into your AI coding assistant to instruct it on how to handle integration tasks:*

```markdown
You are an expert full-stack engineer and integration agent. Your task is to integrate the "Ayojit Intelligence Civic Suite" (a 5-app civic utility product network) into the target website codebase.

### Core Stack
- **Frontend**: Next.js (App Router, React 18, Tailwind CSS v3 following a high-impact Neo-Brutalism theme).
- **Backend Services**: Python FastAPI microservices (using Uvicorn, slowapi, and PyJWT).
- **Database/Auth**: Supabase (PostgreSQL, Row-Level Security (RLS) policies, and HS256 JWT auth).
- **Payment Processing**: Dodo Payments (one-time payments & recurring subscriptions).

### The 5 Civic Applications
1. **Kisan Voice AI** (🌾): Voice Q&A for farmers. Uses SentenceTransformers for vector embeddings, ChromaDB for RAG, and Whisper/Bhashini for regional voice speech-to-text.
2. **PinAI** (📍): Location business intelligence. Uses GODL-India demographic datasets to compare markets by pincode.
3. **DocPatram** (📄): Document scanner and generator. Scrubbing PII (Microsoft Presidio) and generating PDF agreements.
4. **VaadVivaad** (⚖️): AI dispute mediation and arbitration for MSMEs using open-weights reasoning (Sarvam-2B).
5. **HindiDiff** (🎨): Devanagari text-to-image generator leveraging Pollinations AI / Stable Diffusion.

### Your Rules & Directives:
1. **Understand Environment Configuration**: Ensure all service URLs and API keys are mapped properly across the Next.js frontend and FastAPI backends.
2. **Handle Mock and Production Modes**: The code is designed to fallback gracefully to offline/mock models if credentials (like OpenRouter, Supabase, Bhashini) are missing. Make sure both modes remain fully functional.
3. **Enforce Database Schema Integrity**: Set up the database tables (Profiles, Subscriptions, Usage Logs, Lifetime Usage, Documents, Generations) with strict Row-Level Security (RLS) policies.
4. **Verify Quotas and Subscriptions**: Check that requests check the subscription status of users ("free" vs "paid") and track limits (daily limits for Free/Premium users, and lifetime limits like "1 free dispute ever" for VaadVivaad).
5. **Keep Design Consistent**: Respect the clean, bold Neo-Brutalist styling (thick borders, high-contrast badges, orange/yellow/emerald accents) when editing frontend pages.
```

---

## 🛠️ Step-by-Step Integration Instructions

### Step 1: Backend Setup & Environments

Each microservice runs as a standalone Python FastAPI service. They can be launched collectively using `run_suite.py` or deployed inside Docker containers using the root `docker-compose.yml`.

#### Required Environment Variables
Create a `.env` file at the root of the project (and copy appropriate values to `.env.local` for the Next.js frontend):

```bash
# === Database & Auth (Supabase) ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-signing-secret

# === LLM & AI Services ===
OPENROUTER_API_KEY=your-openrouter-key  # Used as fallback for PinAI/VaadVivaad
SARVAM_INFERENCE_URL=https://api.sarvam.ai/v1  # For Sarvam models
HF_SPACE_URL=http://mock-patram-vlm/extract    # For DocPatram HF Space extraction
HF_TOKEN=your-huggingface-token

# === Storage & Email ===
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name  # HindiDiff image CDN
RESEND_API_KEY=your-resend-key

# === Payment gateway (Dodo Payments) ===
DODO_API_KEY=your_dodo_api_key_here
DODO_WEBHOOK_SECRET=your_dodo_webhook_signing_secret

# === Port Mappings for run_suite.py ===
NEXT_PUBLIC_KISAN_API_URL=http://localhost:8000
NEXT_PUBLIC_PINAI_API_URL=http://localhost:8001
NEXT_PUBLIC_DOCPATRAM_API_URL=http://localhost:8002
NEXT_PUBLIC_VAADVIVAAD_API_URL=http://localhost:8003
NEXT_PUBLIC_HINDIDIFF_API_URL=http://localhost:8004
```

---

### Step 2: Supabase Schema Setup

Execute the following SQL statements in the Supabase SQL Editor to provision the database schema:

```sql
-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'hi',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Subscriptions Table (Tracks plan level per application)
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  app_id TEXT NOT NULL CHECK (app_id IN ('kisan-voice-ai', 'pinai', 'docpatram', 'vaadvivaad', 'hindidiff')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
  dodo_payments_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'pending')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id)
);

-- 3. Usage Logs Table (Tracks daily requests)
CREATE TABLE public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  app_id TEXT NOT NULL,
  action TEXT NOT NULL,
  usage_date DATE DEFAULT CURRENT_DATE,
  count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_usage_user_app_date ON public.usage_logs(user_id, app_id, usage_date);

-- 4. Lifetime Usage Table (For VaadVivaad "1 free dispute ever" limit)
CREATE TABLE public.lifetime_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  app_id TEXT NOT NULL,
  action TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id, action)
);

-- 5. Documents Table (For DocPatram Scan History)
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Generations Table (For HindiDiff Generated Images Gallery)
CREATE TABLE public.generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  seed BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifetime_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (Users can only read/edit their own data)
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own subscriptions" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own usage" ON public.usage_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own lifetime_usage" ON public.lifetime_usage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own generations" ON public.generations FOR ALL USING (auth.uid() = user_id);
```

---

### Step 3: Frontend Web Portal Integration

#### Authentication Header
All Next.js frontend pages need to pass the user's Supabase JWT access token in the `Authorization` header to authenticate against the FastAPI services:

```javascript
import { createClient } from '@/lib/supabase'

const getAuthHeaders = async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  }
}
```

#### API Endpoint Integrations

##### 1. Kisan Voice AI (🌾)
- **Search Query**: `POST http://localhost:8000/api/query`
  - Payload: `{"query": "धान की रोकथाम कैसे करें?", "language": "hi", "crop": "rice"}`
- **Retrieve Logs**: `GET http://localhost:8000/logs`

##### 2. PinAI (📍)
- **Get Insight**: `POST http://localhost:8001/insight`
  - Payload: `{"pincode": "834001", "business_type": "retail"}`
- **Get Expansion Report**: `POST http://localhost:8001/expansion`
  - Payload: `{"current_pincode": "834001", "candidate_pincodes": ["834002", "834003"]}`

##### 3. DocPatram (📄)
- **Extract Text/Format**: `POST http://localhost:8002/extract`
  - Payload (Multipart Form Data): File upload containing image or PDF document.

##### 4. VaadVivaad (⚖️)
- **File Dispute**: `POST http://localhost:8003/dispute/file`
  - Payload:
    ```json
    {
      "dispute_type": "payment_default",
      "amount": 15000.0,
      "complainant_name": "Rajesh Kumar",
      "complainant_phone": "9876543210",
      "complainant_statement": "The supplier defaulted on shipment.",
      "respondent_name": "Priya Singh",
      "respondent_phone": "9876543211",
      "language": "hi",
      "dodo_payment_id": null
    }
    ```
- **Submit Response**: `POST http://localhost:8003/dispute/respond`
  - Payload: `{"dispute_id": "dispute_uuid", "respondent_statement": "We delivered but payment was delayed."}`
- **Check Status**: `GET http://localhost:8003/dispute/{dispute_id}`
- **Download Mediation Report PDF**: `GET http://localhost:8003/dispute/{dispute_id}/pdf`

##### 5. HindiDiff (🎨)
- **Generate Image**: `POST http://localhost:8004/generate`
  - Payload: `{"prompt": "एक सुंदर गाँव का दृश्य"}`

---

### Step 4: Verification of Deployment

To verify the integration, run the test suites inside the virtual environment:

```bash
# 1. Create a Python Virtual Environment
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows

# 2. Install Dependencies
pip install -r requirements.txt

# 3. Run Verification Tests
python verify_phase8.py
python verify_offline_stack.py
python verify_free_api_stack.py
python verify_docpatram_alignment.py
python verify_kisan_alignment.py
```

*All tests running successfully with `OK` confirms that the APIs, fallbacks, database structure, and compliance constraints are in alignment.*
