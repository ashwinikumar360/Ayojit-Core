# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-16

This is the initial release of the Ayojit Intelligence multi-app civic product suite.

### Added

- **Shared Core Infrastructure (Ayojit Core)**
  - JWT authorization and quota controller in `core/auth.py` verifying profiles and daily limits.
  - Multi-app subscription and one-time checkout billing routes in `core/billing.py` integrated with Dodo Payments.
  - Supabase database schema definition `supabase/schema.sql` handling user details, active subscriptions, and audit logs.
  - Main Next.js portal application (`app/`) styling with Neo-Brutalist elements, including a unified profile page and daily usage progress meters.

- **Kisan Voice AI**
  - Inbound Twilio calling voice endpoint (`/voice/inbound`) and call process handler (`/voice/process`).
  - Multilingual Speech-to-Text (ASR) and Text-to-Speech (TTS) integration using Bhashini APIs.
  - Custom agricultural knowledge retrieval utilizing Kisan Call Center (KCC) context stored in ChromaDB.
  - Administration view display illustrating call history logs, language breakdowns, and resolution ratios.

- **PinAI**
  - Parameterized search query endpoint (`/query`) analyzing postal directories and Aadhaar centers.
  - SQLite context manager loader processing data from AIKosh CSV records.
  - Insight analysis utilizing Claude Haiku API.

- **DocPatram**
  - Secure document processing API (`/extract`) enforcing strict 10MB limits and MIME type checking.
  - OCR extraction for PDF and image scans using Tesseract wrappers.
  - PII scrubbing utilizing Presidio Analyzer and Anonymizer engines.
  - Document reconstruction calling the Patram-7B open-license model on Hugging Face Spaces.

- **VaadVivaad**
  - Multi-user dispute resolution API tracking claim filing (`/file-dispute`) and mediation responses (`/respond`).
  - Analysis client querying the Sarvam-105B model to generate mediation judgments.
  - ReportLab PDF generator rendering formal mediation briefs with legal disclaimers.

- **HindiDiff**
  - Image generation API gateway (`/generate`) running input sanitizer guards and prompt normalizations.
  - Docker config running the Baaz-v1 diffusion model on Hugging Face Spaces.
  - Cloudinary upload pipeline and gallery view frontend.

- **Legal & Compliance Pages**
  - Terms of Service page complying with the DPDP Act 2023.
  - Privacy Policy page disclosing logging, hashing, and storage terms.
  - Refund policy page detailing cancellation rules for Dodo Payments.
  - Attribution registry detailing open-license details for all source models.
