# Government Pilot & Deployment Framework

This document outlines the deployment models, compliance standards, and data governance practices for deploying applications from the Ayojit product suite within state departments and public agencies.

## Core Government Offerings

Ayojit Intelligence provides two targeted frameworks designed to integrate with state-level administrative systems:

### 1. Kisan Voice AI (Department of Agriculture)
- **Use Case:** Multilingual phone-in IVR advisory service for farmers who do not use smartphones.
- **Data Source:** Integrates the state's Krishi Vigyan Kendra (KVK) datasets and local package of practice (PoP) sheets.
- **Process Flow:** The farmer dials a designated toll-free number, asks a question in their local dialect, and receives an instant voice response verified by the departmental data repository.

### 2. VaadVivaad (MSME Facilitation Councils / Legal Cells)
- **Use Case:** Automated pre-mediation summarization and regulatory dispute analysis.
- **Process Flow:** Both parties submit statements of claim and defense. The system references the MSME Development Act, 2006, runs compliance checks, and generates a structured mediation brief to reduce case prep work for mediation officers.

---

## Deployment Architectures

To accommodate varying governmental security clearances, Ayojit offers two deployment configurations:

### Option A: Empanelled Cloud Deployment (SaaS)
- **Provider:** Hosted on MEITY-empanelled cloud service providers (e.g., NIC Cloud, AWS India region).
- **Maintenance:** Handled entirely by Ayojit under a Service Level Agreement (SLA).
- **Isolation:** Dedicated database schemas and separate JWT keys for each state department.

### Option B: On-Premise / State Data Centre (SDC)
- **Architecture:** Packaged entirely as isolated Docker containers.
- **Execution:** Runs on the government department's private hardware without requiring external internet routing for processing core documents.
- **Dependencies:** All external APIs (like Bhashini translation pipelines) route through the state's official API gateways.

---

## Data Residency & DPDP Act 2023 Compliance

We enforce strict data isolation rules to ensure compliance with the Digital Personal Data Protection (DPDP) Act 2023:

1. **Local Residency:** All databases, logs, and user credentials reside on servers physically located within the territory of India.
2. **PII Isolation:** Citizen phone numbers and names are one-way hashed using SHA-256 at the database boundary.
3. **Audit Logging:** Every administrative action is captured in the database to verify that data processing is restricted to the specific query requested by the citizen.
4. **Consent Revocation:** A citizen's request to clear call transcripts or dispute history triggers an automated deletion script across all backend nodes within 24 hours.

## Initiating a Pilot

State departments and public agencies can initiate a 30-day proof-of-concept pilot with these parameters:

- **Setup Time:** 2 weeks to ingest regional Krishi Vigyan Kendra (KVK) CSVs and configure the Twilio phone mapping.
- **Free Trial Scale:** Limited to 1,000 inbound calls or 50 filed disputes for initial validation.
- **Contact:** Open an issue on this repository using the `partnership` template, or email Ashwini Kumar Tarai directly at `tarai.ashwinikumar@gmail.com`.
