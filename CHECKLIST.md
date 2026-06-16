# Ayojit Suite Project Checklist

This checklist confirms the verification, compliance alignment, and structural completeness of the Ayojit Intelligence product suite repository.

## 1. Repository Completion Check

Every structural file and template listed in the specification exists in the repository:

- [x] **LICENSE:** Created MIT License for Ashwini Kumar Tarai / Ayojit Intelligence.
- [x] **CHANGELOG.md:** Documented the v0.1.0 initial release outlining features and microservices.
- [x] **SECURITY.md:** Described data encryption, PII hashing, Presidio scrubbers, and private advisory disclosure details.
- [x] **CONTRIBUTING.md:** Documented setup instructions, styling conventions, testing guides, and model addition rules.
- [x] **AIKOSH_ATTRIBUTION.md:** Compiled a table detailing models, license types, and exact AIKosh sources.
- [x] **README.md:** Complete overview including comparison tables, ASCII architecture diagrams, B2G pitches, and developer setup.
- [x] **docs/ARCHITECTURE.md:** Detailed explanation of the shared core quota framework.
- [x] **docs/DEPLOYMENT.md:** Provided step-by-step production guides for Supabase, Render, HF, Vercel, and Dodo.
- [x] **docs/GOVERNMENT_PILOT.md:** Outlined Department of Agriculture and MSME pre-mediation pilot strategies.
- [x] **docs/INVESTOR_BRIEF.md:** Detailed unit economics, ₹0 compute costs, and India-specific market sizes.
- [x] **.github/ISSUE_TEMPLATE/:** Structured bug report, partnership, and feature request templates.
- [x] **App Config Files:** All microservices (`kisan-voice-ai`, `pinai`, `docpatram`, `vaadvivaad`, `hindidiff`) have complete requirements files, environment examples, Dockerfiles, and readme guides.

---

## 2. Security & Compliance Enforcement (Rules.md)

Every backend and configuration conforms to security guidelines:

- [x] **No Bare Exceptions:** All python catch blocks write `logger.error` or propagate HTTP errors.
- [x] **PII Protection:** Phone numbers are one-way hashed using SHA-256 before printing to logs.
- [x] **No Local Model Loading on Render:** Heavy torch/transformers blocks are offloaded to remote Hugging Face Spaces (in `hindidiff` and `docpatram`). Backends function as pure API gateways.
- [x] **Upload Restrictions:** DocPatram restricts file sizes to a maximum of 10MB and checks magic headers to prevent system OOM.
- [x] **Webhook Validation:** Webhook endpoints (Dodo Payments and Twilio calls) verify HMAC signatures before executing payloads.
- [x] **CORS Rules:** Strictly restricted to Vercel domains and localhost dev ports. Wildcards are disabled.
- [x] **SlowAPI Rate Limiting:** Enforced at 10 requests/min per IP on endpoints.

---

## 3. Quotas & Attributions

- [x] **Working Quota Meters:** Backend checks active subscription status before querying day's usage counts.
- [x] **Attribution Footers:** The standard AIKosh footer disclaimer appears on every single user dashboard and application landing page in the Next.js frontend.
- [x] **Legal Compliance:** Terms, Privacy, and Refund pages exist and are modified to support Dodo Payments.
