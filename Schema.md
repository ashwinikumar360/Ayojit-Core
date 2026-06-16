# Database Schema Specification (Schema.md) — Ayojit 5-App Suite

## 1. Unified Database Schema
The suite runs on a single PostgreSQL database hosted on Supabase. Row Level Security (RLS) is enabled on all user-specific tables to enforce privacy boundaries.

```
                  ┌──────────────┐
                  │ auth.users   │ (Supabase Internal)
                  └──────┬───────┘
                         │
         ┌───────────────┼───────────────┬───────────────┐
         ▼ (1:1)         ▼ (1:N)         ▼ (1:N)         ▼ (1:N)
   ┌──────────┐   ┌─────────────┐  ┌──────────┐   ┌─────────────┐
   │ profiles │   │subscriptions│  │usage_logs│   │ documents   │
   └──────────┘   └─────────────┘  └──────────┘   └─────────────┘
```

---

## 2. Table Definitions

### 2.1 Profiles Table
Extends the default Supabase `auth.users` authentication schema.
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'hi',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Subscriptions Table
Tracks user plan level ("free" vs "paid") per application.
```sql
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT null,
  app_id TEXT NOT NULL CHECK (app_id IN ('kisan-voice-ai', 'pinai', 'docpatram', 'vaadvivaad', 'hindidiff')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
  razorpay_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'pending')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id)
);
```

### 2.3 Usage Logs Table
Tracks daily transactions to enforce free quota limitations.
```sql
CREATE TABLE public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT null,
  app_id TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g. 'call', 'query', 'doc_gen', 'image_gen'
  usage_date DATE DEFAULT CURRENT_DATE,
  count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimize quota check speeds
CREATE INDEX idx_usage_user_app_date ON public.usage_logs(user_id, app_id, usage_date);
```

### 2.4 Lifetime Usage Table
For VaadVivaad which uses a "1 free dispute ever" limit instead of daily quotas.
```sql
CREATE TABLE public.lifetime_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT null,
  app_id TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g., 'dispute'
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id, action)
);
```

### 2.5 Documents Table
Stores links to processed files for the DocPatram history tab.
```sql
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT null,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.6 Generations Table
Stores HindiDiff outputs for the personal gallery view.
```sql
CREATE TABLE public.generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT null,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  seed BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Row Level Security (RLS) Policies

All user-created data is restricted by RLS:
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifetime_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Policies: Only allow users to query or edit their own records
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own subscriptions" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own usage" ON public.usage_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own lifetime_usage" ON public.lifetime_usage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own generations" ON public.generations FOR ALL USING (auth.uid() = user_id);
```
