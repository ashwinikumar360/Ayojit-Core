-- ============================================================
-- Ayojit Intelligence — Complete Supabase Schema
-- Version: 0.2.0 (SaaS Upgrade)
-- ============================================================

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
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions (per app, per user)
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

-- Daily usage quota tracking
CREATE TABLE public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  app_id TEXT NOT NULL,
  action TEXT NOT NULL,
  asset_id TEXT REFERENCES public.asset_registry(id) ON DELETE SET NULL,
  usage_date DATE DEFAULT CURRENT_DATE,
  count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user_app_date ON public.usage_logs(user_id, app_id, usage_date);

-- Lifetime usage tracking (for VaadVivaad one-time disputes)
CREATE TABLE public.lifetime_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  app_id TEXT NOT NULL,
  action TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id, action)
);

-- Documents tracking (for DocPatram history)
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  asset_id TEXT REFERENCES public.asset_registry(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image generation tracking (for HindiDiff gallery)
CREATE TABLE public.generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  seed BIGINT NOT NULL,
  asset_id TEXT REFERENCES public.asset_registry(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEW TABLES (v0.2.0 SaaS Upgrade)
-- ============================================================

-- Admin users (super-admin access control)
CREATE TABLE public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users ON DELETE SET NULL
);

CREATE INDEX idx_admin_users_email ON public.admin_users(email);

-- Referral codes (unique per user)
CREATE TABLE public.referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  bonus_queries INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);

-- Referral claims (tracking who used whose code)
CREATE TABLE public.referral_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE CASCADE NOT NULL,
  claimed_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referral_code_id, claimed_by)
);

-- Onboarding progress (tracking wizard completion)
CREATE TABLE public.onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  step_completed INT DEFAULT 0 CHECK (step_completed >= 0 AND step_completed <= 4),
  selected_apps TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys (for public API v1 access)
CREATE TABLE public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  scopes TEXT[] DEFAULT '{pinai,docpatram,hindidiff}',
  rate_limit_per_minute INT DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);

-- System status (per-app operational state)
CREATE TABLE public.system_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'degraded', 'outage', 'maintenance')),
  message TEXT,
  updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Changelog entries (public changelog feed)
CREATE TABLE public.changelog_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('feature', 'fix', 'improvement', 'breaking')),
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_changelog_published ON public.changelog_entries(published, published_at DESC);

-- User feedback (general feedback collection)
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  app_id TEXT,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('bug', 'feature', 'general', 'complaint')),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'wontfix')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_status ON public.feedback(status, created_at DESC);

-- ============================================================
-- Row Level Security (RLS) Enablement
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifetime_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Existing policies
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own subscriptions" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own usage" ON public.usage_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own lifetime_usage" ON public.lifetime_usage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own generations" ON public.generations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow public read-only access to asset registry" ON public.asset_registry FOR SELECT USING (true);
CREATE POLICY "Allow read access to ingestion runs for authenticated users" ON public.ingestion_runs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "own compliance logs" ON public.license_compliance_logs FOR ALL USING (auth.uid() = user_id);

-- Admin policies: admins can read all, non-admins see nothing
CREATE POLICY "admin_self_read" ON public.admin_users FOR SELECT USING (auth.uid() = user_id);

-- Referral policies: users see own codes, everyone can look up a code for claiming
CREATE POLICY "own referral codes" ON public.referral_codes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "public referral lookup" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "own referral claims" ON public.referral_claims FOR ALL USING (auth.uid() = claimed_by);

-- Onboarding: users manage their own progress
CREATE POLICY "own onboarding" ON public.onboarding_progress FOR ALL USING (auth.uid() = user_id);

-- API keys: users manage their own keys
CREATE POLICY "own api keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);

-- System status: public read, admin write
CREATE POLICY "public system status" ON public.system_status FOR SELECT USING (true);

-- Changelog: published entries are public
CREATE POLICY "public changelog" ON public.changelog_entries FOR SELECT USING (published = true);

-- Feedback: users see own feedback
CREATE POLICY "own feedback" ON public.feedback FOR ALL USING (auth.uid() = user_id);
