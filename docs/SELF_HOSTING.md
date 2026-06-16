# Self-Hosting Guide

Deploy the full Ayojit Intelligence 5-app suite on your own infrastructure.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Multi-service orchestration |
| Supabase account | Free tier | Auth + database |
| Domain name | Any | Public access |

## Quick Start

```bash
git clone https://github.com/ashwinikumar360/Ayojit-Core.git
cd Ayojit-Core
cp .env.example .env
# Edit .env with your Supabase credentials
docker compose up -d
```

The frontend is available at `http://localhost:3000`.

## Environment Variables

Copy `.env.example` and fill in values:

```env
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Dodo Payments (required for billing)
DODO_API_KEY=your-api-key
DODO_API_SECRET=your-api-secret
DODO_WEBHOOK_SECRET=your-webhook-secret

# Email (optional)
RESEND_API_KEY=your-resend-key
FROM_EMAIL=notifications@yourdomain.com

# Demo mode (set true for sandboxed testing)
DEMO_MODE=false

# Frontend
BASE_URL=https://yourdomain.com
```

## Database Setup

Run the schema against your Supabase project:

```bash
# Using Supabase CLI
supabase db push --db-url postgresql://postgres:PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres

# Or paste contents of supabase/schema.sql and supabase/seed.sql
# into the Supabase SQL Editor
```

## Service Ports

| Service | Port | Health Check |
|---------|------|-------------|
| Frontend | 3000 | `GET /` |
| Kisan Voice AI | 8000 | `GET /health` |
| PinAI | 8001 | `GET /health` |
| DocPatram | 8002 | `GET /health` |
| VaadVivaad | 8003 | `GET /health` |
| HindiDiff | 8004 | `GET /health` |

## Resource Requirements

Minimum for all 6 containers:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Disk | 5 GB | 10 GB |

Heavy inference (Whisper, TTS, image generation) is offloaded to Hugging Face
Spaces APIs, so local GPU is not required.

## White-Label Deployment

Override branding via environment variables:

```env
NEXT_PUBLIC_BRAND_NAME=Your Brand
NEXT_PUBLIC_BRAND_TAGLINE=Your Tagline
NEXT_PUBLIC_BRAND_COLOR=#FF6600
NEXT_PUBLIC_BRAND_LOGO_URL=https://yourdomain.com/logo.png
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
NEXT_PUBLIC_FOOTER_TEXT=Your custom footer text
```

## Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/kisan/ {
        proxy_pass http://localhost:8000/;
    }

    location /api/pinai/ {
        proxy_pass http://localhost:8001/;
    }

    location /api/docpatram/ {
        proxy_pass http://localhost:8002/;
    }

    location /api/vaadvivaad/ {
        proxy_pass http://localhost:8003/;
    }

    location /api/hindidiff/ {
        proxy_pass http://localhost:8004/;
    }
}
```

## Updating

```bash
git pull origin main
docker compose build
docker compose up -d
```

## Troubleshooting

**Container keeps restarting**: Check health endpoints manually with `curl http://localhost:PORT/health`.

**Auth not working**: Verify `SUPABASE_JWT_SECRET` matches your Supabase project settings.

**No images generating**: HindiDiff uses Pollinations API by default. Check if `https://image.pollinations.ai` is reachable from your server.
