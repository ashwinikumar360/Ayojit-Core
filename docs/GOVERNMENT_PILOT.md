# Government Pilot Program

Ayojit Intelligence offers two apps specifically designed for government
deployment: **Kisan Voice AI** and **VaadVivaad**.

## Kisan Voice AI — For State Agriculture Departments

### What It Does

Farmers call an IVR number, speak a crop-related question in Hindi (or
regional language), and receive an AI-generated audio response sourced from
KVK and Kisan Call Centre datasets.

### Deployment Model

| Component | Infrastructure | Who Provides |
|-----------|---------------|-------------|
| IVR Gateway | Telephony provider | Department |
| Speech-to-Text | Whisper model (HF Spaces) | Ayojit |
| Knowledge Base | KCC + KVK datasets | AIKosh / data.gov.in |
| Text-to-Speech | Indic Parler TTS | Ayojit |
| Database | Supabase or NIC PostgreSQL | Department |

### Pilot Timeline

| Week | Activity |
|------|----------|
| 1 | Requirements mapping and dataset localization |
| 2-3 | IVR integration testing |
| 4 | Soft launch in 1 district (50-100 calls/day) |
| 5-8 | Monitoring and accuracy tuning |
| 8+ | Statewide rollout decision |

### Success Metrics

- Call completion rate > 85%
- Answer relevance score > 70% (sampled manual evaluation)
- Average call duration < 90 seconds
- Farmer satisfaction rating > 3.5/5

### Cost to Government

- Zero software licensing fees (MIT licensed)
- Government provides telephony infrastructure only
- Ayojit provides technical support for the pilot duration

---

## VaadVivaad — For MSME Facilitation Councils

### What It Does

MSME facilitation councils submit contract disputes. VaadVivaad generates a
structured AI mediation summary identifying breach points, recommending
resolution approaches, and citing relevant precedents.

### Deployment Model

| Component | Infrastructure | Who Provides |
|-----------|---------------|-------------|
| Web Portal | Vercel / NIC hosting | Ayojit |
| AI Analysis | Sarvam 2B / IndicTrans2 | Ayojit |
| Case Database | Supabase or NIC PostgreSQL | Department |
| PDF Reports | ReportLab (server-side) | Ayojit |

### Pilot Timeline

| Week | Activity |
|------|----------|
| 1 | Workshop with council members |
| 2-3 | Submit 10 sample disputes for AI analysis |
| 4 | Compare AI summaries with human mediator output |
| 5-8 | Process real disputes alongside human review |
| 8+ | Independent operation decision |

### Success Metrics

- Case processing time reduction > 60%
- AI summary alignment with human mediator > 75%
- Council satisfaction rating > 3.5/5

---

## Contact

Email: tarai.ashwinikumar@gmail.com
GitHub: github.com/ashwinikumar360/Ayojit-Core

## Legal Disclaimer

This application uses publicly available AI models/datasets sourced via
AIKosh (aikosh.indiaai.gov.in), maintained by IndiaAI under the Ministry
of Electronics & Information Technology, Government of India. Ayojit
Intelligence is an independent product and is not affiliated with, endorsed
by, or sponsored by AIKosh, IndiaAI, or the Government of India.
