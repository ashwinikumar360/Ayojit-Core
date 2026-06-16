# VaadVivaad

VaadVivaad is an automated ADR (Alternative Dispute Resolution) mediation filing portal designed to help Indian MSMEs resolve commercial conflicts through automated reasoning summaries.

## Integration & API Flow

1. **Filing:** Complainant details the dispute type, amount, and statement. The system verifies if the user is within their lifetime free quota (1 dispute free). Subsequent filings check Dodo Payments for a successful one-time transaction of ₹499.
2. **Defense:** The complainant shares the dispute ID with the respondent, who logs their statement of defense via `/dispute/respond`.
3. **AI Mediation:** A background task queries the Sarvam-105B API, structuring both arguments under MSME Act guidelines to render a mediation summary.
4. **Brief Archival:** A PDF resolution brief is generated using `reportlab` containing official disclaimers and branding, ready for download.

## Configuration & Local Setup

### 1. Requirements
Ensure you have installed:
- Python 3.10+
- SQLite3 (active local session storage).

### 2. Dependencies
Install requirements:
```bash
pip install -r requirements.txt
```

### 3. Run Server
```bash
uvicorn vaadvivaad.backend.main:app --host 127.0.0.1 --port 8003
```

## Production Deployment (Render.com)

1. Deploy this microservice folder to Render as a Web Service.
2. Ensure you set the `SARVAM_API_KEY` for mediation generation and `DODO_API_KEY` for checking sandbox transaction states.
3. Subsequent disputes will require ₹499 one-time payment verification.
