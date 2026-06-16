# Technical Specification (TechSpec.md) — Ayojit 5-App Suite

## 1. System Architecture
The suite is structured as a unified monorepo. The user interface runs on a single Next.js web application deployed to Vercel. Individual backends run as independent FastAPI services deployed to Render.com.

```
       ┌──────────────────────────────┐
       │   Vercel: Next.js Frontend   │
       │  (Unified App Router Portal) │
       └──────────────┬───────────────┘
                      │
        HTTP requests │ (JWT Authorized)
                      ▼
 ┌──────────────────────────────────────────┐
 │ Render: FastAPI Services (Ayojit backends)│
 └──────┬────────────────────────────┬──────┘
        │                            │
        ▼                            ▼
┌──────────────────┐       ┌────────────────────┐
│ Supabase Project │       │ Hugging Face Spaces│
│ (Postgres + Auth)│       │ (Inference Server) │
└──────────────────┘       └────────────────────┘
```

---

## 2. Infrastructure & Hosting
All production-ready hosting plans are mapped strictly to free-forever tiers:

| Component | Provider | Scope | Technical Details |
|---|---|---|---|
| **Frontend** | Vercel | Unified Client Portal | Next.js 14, App Router, SSR/CSR, CORS bound |
| **Auth & DB** | Supabase | Shared Auth & Quotas | Single Supabase project database, RLS enabled |
| **Backends** | Render.com | 4 Thin FastAPI Apps | Free Web Service (750 hrs/month limit, 15 min idle sleep) |
| **Heavy Models** | HF Spaces | Baaz-v1 & Patram-7B | Docker space serving inference endpoints (avoids Render OOM) |
| **Storage** | Cloudinary | Asset Storage | 25GB free tier, signed upload presets |
| **API Endpoints** | Bhashini & Sarvam | Speech & Reasoning | REST APIs with bearer keys |

---

## 3. Critical Fixes & Hardening (from Audit)

### 3.1 SQLite Thread Safety
FastAPI backends using SQLite (PinAI, VaadVivaad, HindiDiff quotas) must **never** share global connection instances across threads.
- **Rule:** Use python's `contextmanager` block or FastAPI dependency injection to open/close SQLite connections for every single query request.
- **Pattern:**
  ```python
  from contextlib import contextmanager
  import sqlite3

  @contextmanager
  def get_db():
      conn = sqlite3.connect(DB_PATH)
      conn.row_factory = sqlite3.Row
      try:
          yield conn
      finally:
          conn.close()
  ```

### 3.2 Out-Of-Memory (OOM) Offloading
Render free-tier instances (512MB RAM cap) cannot load large PyTorch models locally.
- **Rule:** Do not import `transformers` or `diffusers` inside Render.com FastAPI environments.
- **Inference Strategy:**
  - **HindiDiff (Baaz-v1):** Run the diffusers pipeline inside a Hugging Face Space (Docker runtime). The FastAPI service calls the HF Space URL using `httpx`.
  - **DocPatram (Patram-7B):** Run the Patram pipeline in a separate CPU/GPU Hugging Face Space. Render backend calls the space for structured extraction.

### 3.3 Webhook Security
- **Twilio calls:** Validate signatures using Twilio's request validator.
- **Dodo Payments alerts:** Verify webhook signatures using the `DODO_WEBHOOK_SECRET` and Standard Webhooks specification.

---

## 4. Shared Ayojit Core APIs
- `/billing/create-subscription/{app_id}`: Creates Dodo Payments subscription, writes `pending` state to Supabase `subscriptions`.
- `/billing/webhook`: Listens to `payment.succeeded`, `payment.failed`, and `subscription.cancelled` events, updating Supabase accordingly.
- `/core/auth.py` (dependency): Decodes Supabase JWT token (`HS256` payload validation) and enforces daily usage quotas against `usage_logs`.
