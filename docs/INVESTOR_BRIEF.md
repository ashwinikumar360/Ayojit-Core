# Investor Brief

This document details the market opportunity, product monetization, and server cost structures for the Ayojit Intelligence product suite.

## The Opportunity & Addressable Market

Digital adoption in India has reached critical mass through India Stack, but business and citizen-facing tools remain under-developed:

- **Agriculture:** 140 million land-holding farmers require localized advice. Kisan Voice AI acts as a low-cost, voice-based advisor bypassing internet literacy barriers.
- **MSMEs:** 63 million registered small businesses navigate compliance audits. PinAI and VaadVivaad provide instant local directory lookups and mediation filing.
- **Document Services:** Hundreds of millions of citizens require legal documents monthly. DocPatram automates formatting and translation at the village level.

## Unit Economics & Revenue Streams

Each of the five applications runs its own monetization model via Dodo Payments:

| Application | Revenue Model | Price (INR) | Compute Cost | Net Margin |
| --- | --- | --- | --- | --- |
| **PinAI** | Monthly Subscription | ₹299/mo | ₹0 (Local SQLite + free LLM) | ~98% |
| **DocPatram** | Monthly Subscription | ₹999/mo | ₹0 (Free Tesseract + free LLM) | ~98% |
| **VaadVivaad** | One-time Payment | ₹499/dispute | ₹0 (Free remote LLM) | ~98% |
| **HindiDiff** | Monthly Subscription | ₹99/mo | ₹0 (Free HF Spaces CPU) | ~98% |
| **Kisan Voice AI** | B2G Service SLA | Custom | Retained Twilio costs | Variable |

### Compute Cost Structure
Because the backends are built to offload heavy inference (such as image generation and OCR LLM calls) to remote serverless endpoints (OpenRouter and Hugging Face Free Inference API), the studio's monthly server hosting bill is **₹0**. This enables the studio to run with zero burn during initial validation.

## The AIKosh Moat

Integrating open models and datasets directly from AIKosh (aikosh.indiaai.gov.in) provides a dual benefit:
1. **Credibility:** Using datasets compiled by MeitY and IndiaAI ensures alignment with official classification codes.
2. **Defensibility:** Ingesting regional datasets (like local agriculture KVK sheets) creates localized data moats that are difficult for global competitors to replicate.

## Growth & Scale Roadmap

```
Phase 1: Initiative Validation (Months 1-3)
  - Launch 5 apps on free tiers.
  - Capped client quotas limit maximum free-tier API usage to keep hosting costs at ₹0.
  - Collect user subscription data and validate product-market fit.

Phase 2: B2G Pilot Deployments (Months 4-8)
  - Partner with state-level Department of Agriculture for Kisan Voice AI integration.
  - Target MSME facilitation councils for VaadVivaad pre-mediation trial deployments.
  - Convert pilots into multi-year support SLAs.

Phase 3: National Scale (Months 9+)
  - Migrate high-traffic nodes to dedicated GPU servers as user volumes scale.
  - Expand document templates and regional language support.
```
