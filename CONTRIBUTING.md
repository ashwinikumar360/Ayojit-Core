# Contributing to Ayojit Intelligence

We welcome contributions from developers, designers, and domain experts.

## How to Contribute

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/Ayojit-Core.git
cd Ayojit-Core
cp .env.example .env
# Fill in your Supabase credentials
```

### 2. Set Up Development Environment

**Frontend (Next.js)**
```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

**Backend (FastAPI)**
```bash
pip install -r requirements.txt
uvicorn apps.pinai.main:app --reload --port 8001
```

### 3. Branch Naming

```
feature/add-tamil-support
fix/pinai-quota-check
docs/update-api-reference
```

### 4. Commit Messages

Use conventional commits:
```
feat(pinai): add expansion planner endpoint
fix(auth): handle expired JWT tokens
docs(api): update v1 rate limit documentation
```

### 5. Pull Request Process

1. Create a PR against `main`
2. Fill in the PR template
3. Wait for one review
4. Address feedback
5. Merge after approval

## Code Style

### Python (Backend)
- Python 3.11+
- Type hints on all function signatures
- Docstrings on all public functions
- `black` formatting (line length 100)
- `ruff` linting

### TypeScript (Frontend)
- React 18+ with Next.js App Router
- `'use client'` directive on interactive components
- Neo-Brutalism styling (see Design.md)
- No TailwindCSS utilities outside the design system

### SQL
- Table names: lowercase, underscored
- All tables must have RLS policies
- Include migration comments

## Architecture Boundaries

- **Frontend**: Next.js (Vercel) — no server-side data mutations
- **Backend**: FastAPI microservices — one per app
- **Database**: Supabase (PostgreSQL) — shared schema
- **Auth**: Supabase Auth with JWT verification in FastAPI
- **Billing**: Dodo Payments — webhook-based

## Adding a New App

1. Create `apps/your_app/main.py` with FastAPI router
2. Add schema tables to `supabase/schema.sql`
3. Create `app/apps/your-app/page.tsx` frontend
4. Add quota config to `core/auth.py`
5. Update `docker-compose.yml`
6. Add to landing page app grid

## AI Model Policy

All AI models must be:
- Sourced from AIKosh or open model hubs
- Licensed under Apache-2.0, MIT, or GODL-India
- Tracked in the `asset_registry` table
- Attributed in the footer

## License

This project is licensed under the MIT License. By contributing, you agree that
your contributions will be licensed under the same license.
