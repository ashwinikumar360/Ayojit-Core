# Optimization & Performance Guide — Ayojit MVP Suite

This document synthesizes key performance engineering, Next.js, FastAPI, and SQL indexing patterns to ensure our 5-app MVP suite runs with maximum speed and zero hosting costs.

---

## 1. Next.js App Router Optimizations

### 1.1 Server Components by Default
To minimize JavaScript sent to the client browser, keep components as **Server Components** (the default) unless interactive features are required.
- **Server Tasks:** Data fetching, layouts, direct integrations, static text.
- **Client Tasks:** Forms, buttons, real-time counters, search filters (`'use client'`).

### 1.2 Bundle Splitting & Dynamic Imports
For large client-side libraries (like the Razorpay checkout script, dashboards, or charts), load them dynamically:
```typescript
import dynamic from 'next/dynamic'

const RazorpayWidget = dynamic(() => import('@/components/RazorpayWidget'), {
  ssr: false, // Prevents loading on server-side render
  loading: () => <p>Loading payment widget...</p>
})
```

---

## 2. FastAPI Backend Optimizations

### 2.1 Thread-Safe SQLite Connections
Since FastAPI runs asynchronously, any concurrent calls accessing a shared database connection will throw `sqlite3.ProgrammingError`.
**Performant Connection Pattern:**
```python
from contextlib import contextmanager
import sqlite3

DB_PATH = "./data/pinai.db"

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10) # 10-second timeout avoids "DB locked"
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
```

### 2.2 Async Client Requests
For calling external API services (Bhashini, Sarvam, HF Spaces), use an asynchronous HTTP client like `httpx.AsyncClient` instead of blocking synchronous clients like `requests`:
```python
import httpx

async def call_external_model(payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post("https://api.external.com/v1", json=payload)
        return response.json()
```

---

## 3. Database Indexing & Query Tuning

### 3.1 Composite Indexes for Quotas
The quota system queries `usage_logs` by checking the user ID, app ID, and the current date. Without an index, this table scans every single row on every request.
**Index Strategy:**
```sql
CREATE INDEX idx_usage_user_app_date 
ON public.usage_logs(user_id, app_id, usage_date);
```

### 3.2 Pagination for Lists
For dashboard lists (such as past disputes in VaadVivaad or past generations in HindiDiff), always use `LIMIT` and `OFFSET` to prevent loading thousands of rows into memory:
```sql
SELECT * FROM disputes 
WHERE complainant_phone = ? 
ORDER BY created_at DESC 
LIMIT 10 OFFSET 0;
```
