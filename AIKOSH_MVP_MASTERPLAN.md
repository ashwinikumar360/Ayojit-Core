# Ayojit Intelligence × AIKosh — 5-App MVP Suite (Master Build Plan)

> **Founder:** Ashwini Kumar Tarai
> **Parent site:** Ayojit Intelligence (ayojit-intelligence domain — replace with actual)
> **Sub-paths:** `/apps/kisan-voice-ai`, `/apps/pinai`, `/apps/docpatram`, `/apps/vaadvivaad`, `/apps/hindidiff`
> **UI Kit:** Neo-Brutalism UI (https://neo-brutalism-ui-library.vercel.app) — Tailwind CSS, MIT-style free components
> **Hosting:** 100% free-forever tier stack (see §2)
> **Monetisation:** Free daily quota → ethical small paid subscription (₹49–₹999/mo per app) after limit
> **Build philosophy:** One shared "Ayojit Core" (auth + dashboard + billing + quota) reused by all 5 apps. Each app = thin FastAPI service + thin Next.js page using the shared core.

---

## 0. Legal & Attribution (read first — applies to every app)

### 0.1 What you CAN say
- "Powered by **[Model/Dataset Name]**, sourced from **AIKosh (AIKosh.indiaai.gov.in)** — a platform by IndiaAI / Ministry of Electronics & Information Technology, Government of India."
- A small footer badge/link crediting AIKosh as the data/model source — this is factual sourcing, not an endorsement claim.
- "Built by Ayojit Intelligence, an independent product studio. Not affiliated with, endorsed by, or sponsored by the Government of India, MeitY, or IndiaAI."

### 0.2 What you must NOT say or imply
- Do NOT use "AIKosh", "IndiaAI", "Government of India", "MeitY", or the Ashoka Emblem/National emblem as a logo, badge of approval, or in a way suggesting partnership/certification.
- Do NOT claim official government backing for B2G pitches — pitch as "built on open Government of India AI assets via AIKosh", which is factually true and safe.
- Always check the **specific license** of each dataset/model on its AIKosh artefact page before commercial redistribution — AIKosh artefacts can be Open, Registered, or Restricted, each with different reuse terms.

### 0.3 Standard footer disclaimer (use verbatim across all 5 apps)
```
This application uses publicly available AI models/datasets sourced via AIKosh
(aikosh.indiaai.gov.in), an AI repository maintained by IndiaAI under the
Ministry of Electronics & Information Technology, Government of India.
Ayojit Intelligence is an independent product and is not affiliated with,
endorsed by, or sponsored by AIKosh, IndiaAI, or the Government of India.
```

### 0.4 Required compliance pages (shared, build once)
- `/legal/terms` — Terms of Service
- `/legal/privacy` — Privacy Policy (mandatory for any login/payment system in India — DPDP Act 2023 compliance)
- `/legal/refund` — Refund/cancellation policy (required by Razorpay/Stripe for subscriptions)
- `/legal/attribution` — Full AIKosh + per-model attribution table

---

## 1. Shared "Ayojit Core" — Auth + Dashboard + Billing (build ONCE, reuse 5×)

### 1.1 Stack (fully free tier)
| Layer | Tool | Free Tier |
|---|---|---|
| Auth | **Supabase Auth** (email/password + magic link + Google OAuth) | 50,000 MAU free |
| Database | **Supabase Postgres** | 500MB free, never sleeps |
| Backend | **FastAPI** per app, deployed on **Render.com** (free web service) | 750 hrs/month each |
| Frontend | **Next.js 14** (App Router) on **Vercel** | unlimited free deploys |
| Payments | **Razorpay** (India-native, supports UPI/cards) — Subscriptions API | No setup fee, pay-per-transaction only (~2%) |
| Quota/Usage tracking | Supabase Postgres table `usage_logs` | free |
| File/Image storage | **Cloudinary** | 25GB free |
| Styling | Neo-Brutalism UI components (Tailwind) | free, MIT |

> Why Supabase: one free Postgres + Auth covers login, sessions, JWT, and the usage/quota table for ALL 5 apps in a single project — avoids 5 separate databases.

### 1.2 Database schema (`supabase/schema.sql`)
```sql
-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  phone text,
  preferred_language text default 'hi',
  created_at timestamptz default now()
);

-- Subscriptions (per app, per user)
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  app_id text not null check (app_id in
    ('kisan-voice-ai','pinai','docpatram','vaadvivaad','hindidiff')),
  plan text not null default 'free' check (plan in ('free','paid')),
  razorpay_subscription_id text,
  status text default 'active' check (status in ('active','cancelled','past_due')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  unique(user_id, app_id)
);

-- Daily usage quota tracking
create table usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  app_id text not null,
  action text not null,        -- e.g. 'call', 'query', 'doc_gen', 'dispute', 'image_gen'
  usage_date date default current_date,
  count int default 1,
  created_at timestamptz default now()
);
create index idx_usage_user_app_date on usage_logs(user_id, app_id, usage_date);

-- Row Level Security
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table usage_logs enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own subscriptions" on subscriptions for all using (auth.uid() = user_id);
create policy "own usage" on usage_logs for all using (auth.uid() = user_id);
```

### 1.3 Shared FastAPI dependency — `core/auth.py`
```python
"""
Shared auth + quota dependency for all 5 FastAPI backends.
Verifies Supabase JWT, checks/increments daily usage, blocks if free quota exceeded
and user is not on 'paid' plan.
"""
import os
import jwt
from datetime import date
from fastapi import Header, HTTPException, Depends
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Free daily limits per app, per action type
FREE_LIMITS = {
    "kisan-voice-ai": {"call": 9999},       # B2G — usually unlimited / contract based
    "pinai":          {"query": 5},
    "docpatram":      {"doc_gen": 10},
    "vaadvivaad":     {"dispute": 1},        # first dispute free, lifetime
    "hindidiff":      {"image_gen": 10},
}

PAID_PLAN_PRICE_INR = {
    "pinai": 299,
    "docpatram": 999,
    "vaadvivaad": 499,   # per dispute, not monthly
    "hindidiff": 99,
}


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Decode Supabase JWT from Authorization: Bearer <token> header."""
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"],
                              audience="authenticated")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    return {"user_id": payload["sub"], "email": payload.get("email")}


def get_plan(user_id: str, app_id: str) -> str:
    row = (supabase.table("subscriptions")
           .select("plan,status")
           .eq("user_id", user_id).eq("app_id", app_id)
           .maybe_single().execute())
    if row.data and row.data["plan"] == "paid" and row.data["status"] == "active":
        return "paid"
    return "free"


def get_today_usage(user_id: str, app_id: str, action: str) -> int:
    row = (supabase.table("usage_logs")
           .select("count")
           .eq("user_id", user_id).eq("app_id", app_id)
           .eq("action", action).eq("usage_date", str(date.today()))
           .maybe_single().execute())
    return row.data["count"] if row.data else 0


def increment_usage(user_id: str, app_id: str, action: str):
    existing = (supabase.table("usage_logs")
                .select("id,count")
                .eq("user_id", user_id).eq("app_id", app_id)
                .eq("action", action).eq("usage_date", str(date.today()))
                .maybe_single().execute())
    if existing.data:
        supabase.table("usage_logs").update(
            {"count": existing.data["count"] + 1}
        ).eq("id", existing.data["id"]).execute()
    else:
        supabase.table("usage_logs").insert({
            "user_id": user_id, "app_id": app_id,
            "action": action, "usage_date": str(date.today()), "count": 1
        }).execute()


def enforce_quota(app_id: str, action: str):
    """FastAPI dependency factory — use as: Depends(enforce_quota('hindidiff','image_gen'))"""
    async def _check(user: dict = Depends(get_current_user)):
        plan = get_plan(user["user_id"], app_id)
        if plan == "paid":
            return user  # unlimited
        limit = FREE_LIMITS[app_id][action]
        used = get_today_usage(user["user_id"], app_id, action)
        if used >= limit:
            raise HTTPException(429, {
                "message": f"Free daily limit reached ({limit}/{limit}). "
                           f"Upgrade for ₹{PAID_PLAN_PRICE_INR.get(app_id,'—')}/month for unlimited access.",
                "upgrade_url": f"/apps/{app_id}/billing"
            })
        return user
    return _check


def log_usage(app_id: str, action: str):
    """Call after successful response to record usage."""
    def _log(user: dict):
        increment_usage(user["user_id"], app_id, action)
    return _log
```

### 1.4 Shared Razorpay subscription webhook — `core/billing.py`
```python
"""
Razorpay subscription create + webhook handler.
Shared across all paid apps (PinAI, DocPatram, VaadVivaad, HindiDiff).
"""
import os
import hmac
import hashlib
import razorpay
from fastapi import APIRouter, Request, HTTPException, Depends
from core.auth import get_current_user, supabase

router = APIRouter(prefix="/billing", tags=["billing"])

client = razorpay.Client(auth=(
    os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")
))

RAZORPAY_PLAN_IDS = {
    "pinai": os.getenv("RAZORPAY_PLAN_PINAI"),
    "docpatram": os.getenv("RAZORPAY_PLAN_DOCPATRAM"),
    "hindidiff": os.getenv("RAZORPAY_PLAN_HINDIDIFF"),
    # vaadvivaad uses one-time payment, not subscription
}


@router.post("/create-subscription/{app_id}")
async def create_subscription(app_id: str, user: dict = Depends(get_current_user)):
    plan_id = RAZORPAY_PLAN_IDS.get(app_id)
    if not plan_id:
        raise HTTPException(400, "No subscription plan for this app")

    sub = client.subscription.create({
        "plan_id": plan_id,
        "customer_notify": 1,
        "total_count": 12,  # 12 monthly cycles, auto-renews
        "notes": {"user_id": user["user_id"], "app_id": app_id},
    })

    supabase.table("subscriptions").upsert({
        "user_id": user["user_id"],
        "app_id": app_id,
        "plan": "free",  # becomes 'paid' once webhook confirms payment
        "razorpay_subscription_id": sub["id"],
        "status": "pending",
    }, on_conflict="user_id,app_id").execute()

    return {"subscription_id": sub["id"], "short_url": sub.get("short_url")}


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")

    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid webhook signature")

    payload = await request.json()
    event = payload.get("event")
    sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    sub_id = sub_entity.get("id")
    notes = sub_entity.get("notes", {})

    if event == "subscription.activated":
        supabase.table("subscriptions").update({
            "plan": "paid", "status": "active",
            "current_period_end": sub_entity.get("current_end"),
        }).eq("razorpay_subscription_id", sub_id).execute()

    elif event in ("subscription.cancelled", "subscription.halted"):
        supabase.table("subscriptions").update({
            "plan": "free", "status": "cancelled",
        }).eq("razorpay_subscription_id", sub_id).execute()

    return {"status": "ok"}
```

### 1.5 Shared Next.js auth (Supabase) — `lib/supabase.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 1.6 Shared User Dashboard page — `app/dashboard/page.tsx`
Neo-Brutalism styled. Shows: profile, all 5 apps with usage bars, plan status, upgrade buttons, AIKosh attribution footer.

```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const APPS = [
  { id: 'kisan-voice-ai', name: 'Kisan Voice AI', emoji: '🌾', color: 'bg-green-300', limit: '—' },
  { id: 'pinai', name: 'PinAI', emoji: '📍', color: 'bg-blue-300', limit: '5 queries/day' },
  { id: 'docpatram', name: 'DocPatram', emoji: '📄', color: 'bg-yellow-300', limit: '10 docs/day' },
  { id: 'vaadvivaad', name: 'VaadVivaad', emoji: '⚖️', color: 'bg-red-300', limit: '1 free dispute' },
  { id: 'hindidiff', name: 'HindiDiff', emoji: '🎨', color: 'bg-purple-300', limit: '10 images/day' },
]

export default function Dashboard() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [subs, setSubs] = useState<any[]>([])
  const [usage, setUsage] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: subData } = await supabase.from('subscriptions').select('*').eq('user_id', user.id)
        setSubs(subData || [])
        const { data: usageData } = await supabase.from('usage_logs').select('*')
          .eq('user_id', user.id).eq('usage_date', new Date().toISOString().slice(0,10))
        setUsage(usageData || [])
      }
    })()
  }, [])

  const planFor = (appId: string) => subs.find(s => s.app_id === appId)?.plan || 'free'
  const usageFor = (appId: string) => usage.find(u => u.app_id === appId)?.count || 0

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="border-4 border-black bg-yellow-300 rounded-none p-6 mb-8
                      shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black">Welcome, {user?.email?.split('@')[0] || 'User'} 👋</h1>
        <p className="font-bold mt-1">Ayojit Intelligence — AIKosh App Suite</p>
      </div>

      {/* App grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {APPS.map(app => (
          <div key={app.id}
            className={`border-4 border-black ${app.color} rounded-none p-5
                       shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                       hover:translate-x-[2px] hover:translate-y-[2px]
                       hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-3xl">{app.emoji}</div>
                <h2 className="text-xl font-black mt-1">{app.name}</h2>
                <p className="text-sm font-bold mt-1">Plan: {planFor(app.id).toUpperCase()}</p>
                <p className="text-sm">Today: {usageFor(app.id)} used · Limit: {app.limit}</p>
              </div>
              <div className="flex flex-col gap-2">
                <a href={`/apps/${app.id}`}
                   className="border-2 border-black bg-white px-3 py-1 font-bold text-sm
                              shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">Open →</a>
                {planFor(app.id) === 'free' && app.id !== 'kisan-voice-ai' && (
                  <a href={`/apps/${app.id}/billing`}
                     className="border-2 border-black bg-black text-white px-3 py-1 font-bold text-sm
                                shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">Upgrade</a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AIKosh attribution footer */}
      <div className="border-4 border-black bg-gray-100 rounded-none p-4 text-xs font-mono
                      shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        This application uses publicly available AI models/datasets sourced via{' '}
        <a href="https://aikosh.indiaai.gov.in" className="underline font-bold"
           target="_blank" rel="noopener noreferrer">AIKosh</a>
        {' '}(aikosh.indiaai.gov.in), maintained by IndiaAI under MeitY, Government of India.
        Ayojit Intelligence is an independent product and is not affiliated with, endorsed by,
        or sponsored by AIKosh, IndiaAI, or the Government of India.
      </div>
    </div>
  )
}
```

---

## 2. Free Hosting Map — All 5 Apps + Core (Zero Cost)

| Component | Service | Free Tier | Notes |
|---|---|---|---|
| Ayojit main site + 5 sub-pages | **Vercel** | unlimited | one Next.js project, route groups |
| Supabase (auth+db, shared) | **Supabase** | 500MB DB, 50k MAU | one project for all 5 apps |
| Kisan Voice AI backend | **Render.com** | 750 hrs/mo | FastAPI, sleeps when idle (B2G usage is bursty, fine) |
| PinAI backend | **Render.com** | 750 hrs/mo | second free Render service |
| DocPatram backend | **Render.com** | 750 hrs/mo | OCR-heavy → keep model calls light |
| VaadVivaad backend | **Render.com** | 750 hrs/mo | |
| HindiDiff backend + model | **Hugging Face Spaces (Docker)** | free CPU (GPU optional paid) | Baaz-v1 model lives here |
| Image storage (HindiDiff outputs) | **Cloudinary** | 25GB | |
| Payments | **Razorpay** | pay-as-you-go, no fixed cost | |
| Voice (Kisan) | **Twilio** | $15 trial credit, then pay-per-min | only paid bit — pass B2G contract cost |
| Language APIs | **Bhashini (Govt)** + **Sarvam AI** | free | |

> Render free services sleep after 15 min idle and cold-start in ~30-50s — acceptable for an MVP. Upgrade only the highest-traffic backend to a $7/mo plan once revenue justifies it.

---

## 3. Per-App Build Checklist (do one at a time)

### App 1 — Kisan Voice AI (`/apps/kisan-voice-ai`)
- [ ] Reuse existing FastAPI code from `aikosh_mvp_all5.md` (Bhashini wrapper, KCC RAG)
- [ ] Wrap `/call` webhook with `get_current_user` only if exposing a dashboard for govt admins (citizen calls themselves don't need login)
- [ ] Add admin-only dashboard page: call logs, language breakdown, resolution rate (for B2G demo)
- [ ] Deploy backend → Render; Twilio webhook → Render URL
- [ ] No consumer billing (B2G contract model) — dashboard shows "Contact us for deployment" CTA

### App 2 — PinAI (`/apps/pinai`)
- [ ] FastAPI `/query` endpoint wrapped with `Depends(enforce_quota('pinai','query'))`
- [ ] On success, call `log_usage('pinai','query')`
- [ ] Frontend: Neo-brutalism search bar + result cards, quota meter "X/5 today"
- [ ] Billing page → Razorpay ₹299/mo plan via `/billing/create-subscription/pinai`

### App 3 — DocPatram (`/apps/docpatram`)
- [ ] `/generate-doc` wrapped with `enforce_quota('docpatram','doc_gen')`
- [ ] Patram-7B + OCR Toolkit calls via AIKosh model endpoints
- [ ] Billing: ₹999/mo via Razorpay; B2G tender CTA on landing page
- [ ] Dashboard tab: "My Documents" — list of generated docs with download links (Cloudinary/Supabase storage)

### App 4 — VaadVivaad (`/apps/vaadvivaad`)
- [ ] `/file-dispute` wrapped with `enforce_quota('vaadvivaad','dispute')` (lifetime limit = 1, not daily — adjust query to `usage_date is null` or use a separate `lifetime_usage` table)
- [ ] After first free use, subsequent disputes → Razorpay **one-time payment** (₹499) via `client.order.create()`, not subscription
- [ ] Dashboard tab: "My Disputes" — status tracker (filed → in review → resolved)

### App 5 — HindiDiff (`/apps/hindidiff`)
- [ ] `/generate` wrapped with `enforce_quota('hindidiff','image_gen')`
- [ ] Baaz-v1 hosted on HF Spaces; FastAPI on Render calls HF Spaces inference endpoint (or HF Spaces directly serves FastAPI)
- [ ] Generated images → Cloudinary upload, store URL in `usage_logs` metadata or new `generations` table
- [ ] Dashboard tab: "My Gallery" — grid of past generations with re-download
- [ ] Billing: ₹99/mo via Razorpay

---

## 4. Ayojit Intelligence Front Page — New Section

Add to homepage (neo-brutalism style), linking to `/apps`:

```html
<section class="border-4 border-black bg-orange-300 p-8 my-12
                shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
  <h2 class="text-4xl font-black mb-2">🇮🇳 AIKosh-Powered AI Suite</h2>
  <p class="font-bold mb-6">
    Five practical AI tools built on open Government of India AI datasets &amp; models
    via AIKosh — for farmers, citizens, businesses, and researchers.
  </p>
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
    <a href="/apps/kisan-voice-ai" class="border-2 border-black bg-white p-3 font-bold
       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">🌾 Kisan Voice AI</a>
    <a href="/apps/pinai" class="border-2 border-black bg-white p-3 font-bold
       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">📍 PinAI</a>
    <a href="/apps/docpatram" class="border-2 border-black bg-white p-3 font-bold
       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">📄 DocPatram</a>
    <a href="/apps/vaadvivaad" class="border-2 border-black bg-white p-3 font-bold
       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">⚖️ VaadVivaad</a>
    <a href="/apps/hindidiff" class="border-2 border-black bg-white p-3 font-bold
       shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">🎨 HindiDiff</a>
  </div>
  <p class="text-xs font-mono mt-6">
    Powered by open models/datasets from AIKosh (aikosh.indiaai.gov.in), IndiaAI/MeitY,
    Government of India. Ayojit Intelligence is independently operated and not affiliated
    with or endorsed by AIKosh, IndiaAI, or the Government of India.
  </p>
</section>
```

---

## 5. Security Checklist (apply to every backend)

- [ ] All API endpoints require valid Supabase JWT (`get_current_user`) — no anonymous write access
- [ ] CORS restricted to `https://ayojit-intelligence.vercel.app` (+ localhost in dev)
- [ ] Rate limiting via `slowapi` (10 req/min/IP) on top of quota system — prevents abuse before auth
- [ ] All secrets (Supabase keys, Razorpay keys, Bhashini keys, HF tokens) in environment variables only — never committed
- [ ] Razorpay webhook signature verification (shown in §1.4) — mandatory, prevents fake "payment success" calls
- [ ] Input validation via Pydantic models on every endpoint (file size limits for DocPatram uploads, prompt length caps for HindiDiff)
- [ ] HTTPS enforced (Render/Vercel/HF Spaces all provide free TLS automatically)
- [ ] Supabase Row Level Security enabled on all tables (shown in §1.2) — users can only read/write their own rows
- [ ] No PII stored beyond email/phone/name; Privacy Policy discloses what's collected (DPDP Act 2023)
- [ ] Audit log: every `usage_logs` insert is timestamped — usable for dispute resolution if a user disputes a charge

---

## 6. Environment Variables (all backends + frontend)

```env
# Supabase (shared)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Razorpay (shared)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_PINAI=
RAZORPAY_PLAN_DOCPATRAM=
RAZORPAY_PLAN_HINDIDIFF=

# App-specific (from original aikosh_mvp_all5.md)
BHASHINI_API_KEY=
BHASHINI_USER_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SARVAM_API_KEY=
HF_TOKEN=
CLOUDINARY_URL=
```

---

## 7. Build Order (recommended)

1. Set up Supabase project + run `schema.sql` (§1.2) — **30 min**
2. Build "Ayojit Core" auth pages (login/signup/dashboard) in Next.js with Neo-Brutalism components — **half day**
3. Pick ONE app (suggest **HindiDiff** — most visual, easiest demo) → wire its FastAPI through `core/auth.py` quota system, deploy to Render/HF Spaces — **half day**
4. Add Razorpay billing for that one app, test with Razorpay test mode — **2-3 hrs**
5. Repeat steps 3-4 for remaining 4 apps, reusing the same core — **1 day total** (each app gets faster)
6. Add Ayojit homepage section (§4) + legal pages (§0.4) — **half day**
7. Deploy everything, test end-to-end with a real ₹1 test transaction in Razorpay live mode before going public.

---

*All original per-app source code (Bhashini wrapper, RAG, OCR, model calls, React frontends) comes from `aikosh_mvp_all5.md` — this document adds the auth/dashboard/billing/security layer that wraps around it. MIT licensed.*
