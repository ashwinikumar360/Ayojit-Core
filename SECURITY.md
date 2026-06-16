# Security Policy

This document outlines the security controls, data protection architectures, and vulnerability disclosure procedures implemented across the Ayojit Intelligence product suite.

## Security Controls Overview

The system implements security checks at both the API gateway and database layers to safeguard client data and prevent resource exhaustion:

| Layer | Security Mechanism | Scope of Implementation |
| --- | --- | --- |
| **API Authentication** | Supabase JSON Web Tokens (JWT) | Validated on every backend request via `get_current_user` in `core/auth.py`. Anonymous write access is disabled. |
| **Database Access** | Row Level Security (RLS) | Enabled on all tables in Supabase Postgres. Rules limit SELECT/INSERT/UPDATE actions to the matching `auth.uid()`. |
| **Rate Limiting** | SlowAPI (10 requests/min per IP) | Active on all microservice endpoints to prevent Denial-of-Service attacks. |
| **Payment Security** | Webhook HMAC-SHA256 Signatures | Verified server-side in `core/billing.py` using Dodo Payments' Standard Webhook signature verification before updating account status. |
| **Identity Protection** | PII Hashing & Masking | Hashing user phone numbers and emails using SHA-256 before logging. Kisan Voice logs and VaadVivaad data redact raw citizen metrics. |
| **PII Scrubbing** | Presidio Analyzer & Anonymizer | DocPatram scans documents and filters out Aadhaar numbers, email addresses, names, and phone numbers before analysis. |
| **Input Validation** | Pydantic Schemas & Magic MIME checks | Establishes size caps (10MB) and reads magic bytes to prevent shell injection or large file buffers in DocPatram. |

## Data Privacy & DPDP Act 2023 Compliance

To comply with the Digital Personal Data Protection (DPDP) Act 2023, the application adheres to these privacy constraints:

1. **Purpose Limitation:** User information (names, phone numbers, and documents) is processed only to perform the user-requested operation (RAG search, dispute filing, or OCR extraction) and is not reused for model training.
2. **Data Minimization:** No Aadhaar numbers, PAN cards, or raw government IDs are stored. They are hashed at the client edge or scrubbed during OCR processing.
3. **Right to Erasure:** Users can initiate account deletion via the dashboard, which triggers database cascades to delete profile records and logs.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, do not open a public GitHub issue. Instead, follow these disclosure steps:

1. Navigate to the "Security" tab of the repository on GitHub.
2. Select "Advisories" under the Vuln management section.
3. Click "New draft advisory" to securely submit a private report.
4. Include detailed replication steps, impacted endpoints, and environment variables.

We will review the advisory and release patches within 48 hours of verification.
