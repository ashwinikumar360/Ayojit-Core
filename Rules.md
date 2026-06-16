# Code Standards & Constraints (Rules.md) — Ayojit 5-App Suite

## 1. Database Connection Management
- **SQLite Rule:** Do not open global sqlite3 connections in backend modules. Always open and close database connections within request lifecycle contexts (e.g., using context managers or FastAPI dependencies).
- **Postgres Rule:** Restrict database write permissions using Row Level Security (RLS) on all user-facing tables. All client queries must be bound to the authorized user's JWT ID (`auth.uid()`).

---

## 2. Resource & Memory Caps
- **Render.com free-tier instances (512MB RAM cap):** Never import `transformers`, `diffusers`, `torch`, or run local model training/generation on these instances.
- **Offloading rule:** All heavy machine learning inference (Baaz-v1, Patram-7B) must be offloaded to Hugging Face Spaces or other third-party servers. The Render backend must only function as an API gateway proxy.
- **File size limits:** The DocPatram API must strictly reject any file upload larger than 10MB to avoid server memory exhaustion.

---

## 3. Webhook & Endpoint Security
- **Signature verification:** Every webhook endpoint (Razorpay payment notifications, Twilio incoming voice calls) must verify HTTP request signatures server-side before parsing payloads.
- **JWT authorization:** All non-webhook endpoints must require a valid Supabase JWT token. Anonymous writes are strictly prohibited.
- **CORS configuration:** Restrict CORS origins to `https://ayojit-intelligence.vercel.app` and `http://localhost:3000` (for development). Never allow wildcard `*` origins.
- **Rate limiting:** Implement `slowapi` rate limits (maximum 10 requests per minute per IP address) on all endpoints on top of the quota system.

---

## 4. Error Handling & Logging
- **No bare exceptions:** Never use bare `except: pass` or `catch(e) {}` blocks. Every exception must be explicitly logged using Python's standard `logging` or returned to the user with a descriptive error schema.
- **Sanitized logs:** Never log user Personal Identifiable Information (PII) such as phone numbers, emails, or government ID digits. Anonymize/hash fields before printing.
