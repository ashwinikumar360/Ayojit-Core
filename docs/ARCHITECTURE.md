# System Architecture

This document describes the technical layout, shared core implementation, and infrastructure integrations for the Ayojit Intelligence product suite.

## High-Level System Design

The studio is designed to minimize database and server footprints by reusing a single shared backend authentication and database layer across five distinct FastAPI services and a unified Next.js portal.

```
       +-----------------------------------------------------------+
       |                  Next.js Portal (Vercel)                  |
       |  - Unified Dashboard showing app quotas & billing status   |
       |  - Neo-Brutalist UI Layout with custom styling rules      |
       +-----------------------------------------------------------+
                                     |
                                     | API calls with Authorization header
                                     v
+-----------------------------------------------------------------------------------+
|                        Shared Core Layer (FastAPI backends)                        |
|                                                                                   |
|  - core/auth.py: Decodes Supabase JWT, reads plans, counts and logs daily usage.  |
|  - core/billing.py: Manages subscription checkouts and handles webhooks.          |
+-----------------------------------------------------------------------------------+
        |                                       |
        +---------------+                       +---------------+
                        |                                       |
                        v                                       v
        +-------------------------------+       +-------------------------------+
        |        Client Database        |       |          Remote APIs          |
        |                               |       |                               |
        |  - Supabase Postgres:         |       |  - OpenRouter (Gemma-2-9b)    |
        |    profiles, subscriptions,   |       |  - Hugging Face Inference     |
        |    usage_logs tables.         |       |    (Whisper-large-v3)         |
        |  - SQLite3 (Local):           |       |  - Bhashini Gov Translate     |
        |    pincodes & center details  |       |  - Cloudinary CDN             |
        +-------------------------------+       +-------------------------------+
```

## Shared Core Design Pattern

### 1. Database Consolidation
Instead of running five separate databases for five distinct applications, we use a consolidated database schema in a single Supabase project. Every log, profile, and subscription record includes an `app_id` column (e.g. `'pinai'`, `'hindidiff'`).

### 2. JWT-Based Auth Verification
The Next.js frontend runs the Supabase Client SDK, obtaining JSON Web Tokens (JWT) for authenticated users. When calling any backend microservice endpoint, the authorization token is passed in the request header. The microservice's `core/auth.py` validates the token locally using the shared `SUPABASE_JWT_SECRET`. This prevents unauthorized endpoint usage.

### 3. Subscription & Quota Controller
The quota controller interceptor (`enforce_quota`) runs before any processing logic:
1. Resolves user details from the JWT.
2. Checks the `subscriptions` table. If the subscription status is `active` and plan is `paid`, the request proceeds under the premium limits.
3. If the plan is `free`, it queries `usage_logs` to count user requests on the current calendar date (`usage_date = current_date`).
4. If the count exceeds the set limit (e.g., 5 queries/day for PinAI), the system throws a `429 Quota Exceeded` error and stops processing.
5. On successful API execution, the handler invokes `log_usage` to increment the day's record.

This ensures zero server processing or API costs are incurred after the user hits their limit.

## Service Selection Rationale

- **Supabase (Postgres & Auth):** Provides instant JWT authorization, persistent connection pools, and Row Level Security (RLS) rules out-of-the-box. The free tier limits are sufficient for early stage operations.
- **Render.com (FastAPI hosts):** Deploys python applications instantly. Microservices sleep during inactivity, which fits the bursty usage pattern of utility apps.
- **Hugging Face Spaces (Docker):** Allows running models on dedicated CPU instances without consuming Render memory limits.
- **Cloudinary:** Serves as a secure media storage and optimization CDN. Used to store generated image results and documents.
