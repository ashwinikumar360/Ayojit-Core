-- Asset Registry (global tracking of open models and datasets)
CREATE TABLE public.asset_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  version_tag TEXT NOT NULL,
  license_type TEXT NOT NULL,
  commercial_use BOOLEAN NOT NULL DEFAULT TRUE,
  attribution_requirement BOOLEAN NOT NULL DEFAULT FALSE,
  share_alike BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_asset_id TEXT REFERENCES public.asset_registry(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('approved', 'approved_with_attribution', 'approved_with_share_alike', 'pending_review', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingestion Runs (normalizing dataset snapshots and storing hashes)
CREATE TABLE public.ingestion_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id TEXT REFERENCES public.asset_registry(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  schema_metadata JSONB DEFAULT '{}',
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

-- License Compliance Logs (audit logs of model/dataset reuse)
CREATE TABLE public.license_compliance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  action TEXT NOT NULL,
  asset_id TEXT REFERENCES public.asset_registry(id) ON DELETE SET NULL,
  license_type TEXT,
  attribution_text TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'hi',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions (per app, per user)
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  app_id TEXT NOT NULL CHECK (app_id IN ('kisan-voice-ai', 'pinai', 'docpatram', 'vaadvivaad', 'hindidiff')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
  razorpay_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'pending')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id)
);

-- Daily usage quota tracking
CREATE TABLE public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT null,
  app_id TEXT NOT NULL,
  action TEXT NOT NULL,        -- e.g. 'call', 'query', 'doc_gen', 'image_gen'
  asset_id TEXT REFERENCES public.asset_registry(id) ON DELETE SET NULL,
  usage_date DATE DEFAULT CURRENT_DATE,
  count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user_app_date ON public.usage_logs(user_id, app_id, usage_date);

-- Lifetime usage tracking (for VaadVivaad one-time disputes)
CREATE TABLE public.lifetime_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT null,
  app_id TEXT NOT NULL,
  action TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id, action)
);

-- Documents tracking (for DocPatram history)
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT null,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  asset_id TEXT REFERENCES public.asset_registry(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image generation tracking (for HindiDiff gallery)
CREATE TABLE public.generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT null,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  seed BIGINT NOT NULL,
  asset_id TEXT REFERENCES public.asset_registry(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Enablement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifetime_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_compliance_logs ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own subscriptions" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own usage" ON public.usage_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own lifetime_usage" ON public.lifetime_usage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own generations" ON public.generations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow public read-only access to asset registry" ON public.asset_registry FOR SELECT USING (true);
CREATE POLICY "Allow read access to ingestion runs for authenticated users" ON public.ingestion_runs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "own compliance logs" ON public.license_compliance_logs FOR ALL USING (auth.uid() = user_id);
