# Ayojit Intelligence — Free AI Models, Datasets & Services Master Reference

> **Scope:** Every free/open resource usable across all 5 apps (HindiDiff, PinAI, DocPatram, VaadVivaad, Kisan Voice AI) plus shared Ayojit Core infrastructure.
> **Last verified:** June 2026
> **Maintained by:** Ashwini Kumar Tarai, Ayojit Intelligence
> **Auto-fetch strategy:** See §7 for cron jobs and webhook setup to keep resources current automatically.

---

## Table of Contents

1. [AIKosh Models — Free Tier](#1-aikosh-models--free-tier)
2. [AIKosh Datasets — Free Tier](#2-aikosh-datasets--free-tier)
3. [Bhashini — Free Government Language APIs](#3-bhashini--free-government-language-apis)
4. [Sarvam AI — Free Tier Models](#4-sarvam-ai--free-tier-models)
5. [Free Hosting & Infrastructure](#5-free-hosting--infrastructure)
6. [Free Supporting APIs & Tools](#6-free-supporting-apis--tools)
7. [Auto-Fetch Strategy — Keep Resources Current](#7-auto-fetch-strategy--keep-resources-current)
8. [Registration Checklist](#8-registration-checklist)
9. [License Verification Checklist](#9-license-verification-checklist)
10. [Cost Summary — What Is Actually Free vs Paid](#10-cost-summary--what-is-actually-free-vs-paid)

---

---

## 1. AIKosh Models — Free Tier

> **Platform:** [aikosh.indiaai.gov.in](https://aikosh.indiaai.gov.in)
> **Stats (Feb 2026):** 273 AI models, 7,541 datasets across 20 sectors
> **Registration:** Required for download. Free. Register at aikosh.indiaai.gov.in.
> **License types:** Open (no restriction), Registered (need account), Restricted (case-by-case). Verify each before commercial use.

---

### 1.1 Baaz-v1 — HindiDiff (Image Generation)

| Field | Detail |
|---|---|
| **App** | HindiDiff |
| **Purpose** | Hindi Devanagari text-to-image diffusion model |
| **Source** | AIKosh (aikosh.indiaai.gov.in/models) |
| **Hosting** | Self-host on Hugging Face Spaces (Docker) — free CPU tier |
| **Cost** | ₹0 for CPU inference; $9/mo for T4 GPU upgrade if needed |
| **Integration** | HF Spaces inference endpoint → Render FastAPI `/generate` |
| **Auto-fetch** | Yes — Render FastAPI calls HF Spaces endpoint on every `/generate` request |
| **Cold start** | ~30–60s on free CPU HF Spaces; add keep-alive ping every 10 min |
| **License** | **Verify on AIKosh artefact page before commercial launch** |
| **Action needed** | Register on AIKosh → download weights → deploy to HF Spaces Docker |

**Integration code skeleton:**
```python
import httpx

HF_SPACES_URL = os.getenv("HF_SPACES_BAAZ_URL")  # e.g. https://user-baaz-v1.hf.space

async def call_baaz(prompt: str, style: str, size: str, variations: int) -> list[str]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(f"{HF_SPACES_URL}/generate", json={
            "prompt": prompt,
            "style": style,
            "size": size,
            "num_images": variations
        })
        resp.raise_for_status()
        return resp.json()["image_urls"]
```

---

### 1.2 Patram-7B + OCR Toolkit + ARX — DocPatram

| Field | Detail |
|---|---|
| **App** | DocPatram |
| **Purpose** | Indian government document generation (affidavit, RTI, NOC, income cert, etc.) |
| **Models** | Patram-7B (doc gen) + AIKosh OCR Toolkit (Indic OCR) + ARX (template library) |
| **Source** | AIKosh |
| **Hosting** | AIKosh inference API or self-hosted HF Spaces |
| **Cost** | ₹0 |
| **RAM needed** | Patram-7B requires ≥8GB RAM. Render free tier = 512MB. Use AIKosh GPU notebook or HF Spaces for inference. |
| **Auto-fetch** | Patram-7B called on every `/generate-doc`; OCR Toolkit called on every file upload |
| **Fallback** | Claude API (claude-sonnet-4-6) with hardcoded doc templates if Patram-7B unavailable |
| **License** | **Verify on AIKosh artefact page** |
| **Action needed** | Register AIKosh → get model API endpoint → add to `.env` |

**Integration code skeleton:**
```python
PATRAM_API_URL = os.getenv("PATRAM_API_URL")     # AIKosh model endpoint
AIK_OCR_URL   = os.getenv("AIK_OCR_URL")         # AIKosh OCR Toolkit endpoint
AIK_API_KEY   = os.getenv("AIKOSH_API_KEY")       # AIKosh registered user API key

async def generate_document(doc_type: str, user_details: dict, ocr_text: str = "") -> str:
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(PATRAM_API_URL, json={
            "doc_type": doc_type,
            "user_details": user_details,
            "ocr_context": ocr_text,
        }, headers={"Authorization": f"Bearer {AIK_API_KEY}"})
        resp.raise_for_status()
        return resp.json()["document_text"]

async def run_ocr(file_bytes: bytes, mime_type: str) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(AIK_OCR_URL,
            files={"file": ("upload", file_bytes, mime_type)},
            headers={"Authorization": f"Bearer {AIK_API_KEY}"}
        )
        resp.raise_for_status()
        return resp.json()["text"]
```

---

### 1.3 Sarvam-105B — VaadVivaad (Dispute Resolution)

| Field | Detail |
|---|---|
| **App** | VaadVivaad |
| **Purpose** | Multilingual legal reasoning for AI-mediated dispute resolution |
| **Source** | AIKosh or Sarvam AI direct API |
| **Cost** | ₹0 via AIKosh; via Sarvam direct: ₹1,000 free credits on signup |
| **Languages** | Hindi + 22 Indian languages |
| **Auto-fetch** | Called on every verified dispute (post-payment or free first dispute) |
| **Fallback** | Sarvam-M via OpenRouter (completely free, 33K context, unlimited tokens) |
| **License** | **Verify AIKosh artefact license; Sarvam direct API: standard SaaS ToS** |
| **Action needed** | Register AIKosh + register sarvam.ai → get API keys |

**Primary + fallback integration:**
```python
SARVAM_105B_URL = os.getenv("SARVAM_105B_URL")    # AIKosh endpoint
SARVAM_API_KEY  = os.getenv("SARVAM_API_KEY")      # Sarvam direct key (fallback)
OPENROUTER_KEY  = os.getenv("OPENROUTER_API_KEY")  # Sarvam-M free fallback

async def get_dispute_resolution(description: str) -> str:
    # Try Sarvam-105B first
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(SARVAM_105B_URL, json={
                "messages": [{"role": "user", "content": DISPUTE_PROMPT.format(desc=description)}]
            }, headers={"Authorization": f"Bearer {SARVAM_API_KEY}"})
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception:
        # Fallback: Sarvam-M via OpenRouter (free, unlimited)
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post("https://openrouter.ai/api/v1/chat/completions", json={
                "model": "sarvamai/sarvam-m:free",
                "messages": [{"role": "user", "content": DISPUTE_PROMPT.format(desc=description)}],
                "max_tokens": 1000
            }, headers={"Authorization": f"Bearer {OPENROUTER_KEY}"})
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

DISPUTE_PROMPT = """
You are an AI mediator trained in Indian civil and consumer law.
Analyze this dispute and provide: (1) brief case summary, (2) applicable law/regulation,
(3) recommended resolution, (4) next steps for the claimant.
Keep response under 500 words. Be factual, not prescriptive.
Dispute: {desc}
"""
```

---

### 1.4 How to Get AIKosh Model API Keys

```
1. Go to: https://aikosh.indiaai.gov.in
2. Click "Register" → create free account (name, email, organisation type: "Startup")
3. Browse Models → find Baaz-v1 / Patram-7B / Sarvam-105B
4. Click "Request Access" on each model artefact page
5. Once approved: go to Profile → API Keys → Generate Key
6. Add to .env: AIKOSH_API_KEY=<your_key>
7. Check each model's artefact page for:
   - License type (Open / Registered / Restricted)
   - Usage limits
   - Inference endpoint URL
```

---

### 1.5 AIKosh Auto-Discovery API (all 5 apps)

AIKosh provides a "Fetch Dataset List" API to programmatically get all available datasets.
Use this weekly via cron to auto-detect new relevant datasets.

```python
# scripts/aikosh_discovery.py — run weekly via cron
import httpx, os, json

AIKOSH_API_KEY = os.getenv("AIKOSH_API_KEY")

async def fetch_aikosh_catalogue():
    """Fetch all AIKosh datasets and models. Check for new entries in relevant sectors."""
    async with httpx.AsyncClient() as client:
        # Dataset list endpoint
        datasets = await client.get(
            "https://aikosh.indiaai.gov.in/api/v1/datasets",
            headers={"Authorization": f"Bearer {AIKOSH_API_KEY}"}
        )
        # Model list endpoint  
        models = await client.get(
            "https://aikosh.indiaai.gov.in/api/v1/models",
            headers={"Authorization": f"Bearer {AIKOSH_API_KEY}"}
        )
    
    catalogue = {
        "datasets": datasets.json(),
        "models": models.json(),
        "fetched_at": str(datetime.utcnow())
    }
    
    # Save to local cache
    with open("data/aikosh_catalogue_cache.json", "w") as f:
        json.dump(catalogue, f, indent=2)
    
    # Filter for sectors relevant to Ayojit apps
    RELEVANT_SECTORS = ["Agriculture", "Legal & Justice", "Language", "Geography", "Healthcare"]
    new_entries = [
        item for item in catalogue["datasets"]
        if item.get("sector") in RELEVANT_SECTORS
        and item.get("created_at") > LAST_FETCHED_DATE
    ]
    
    if new_entries:
        # Alert: email Ashwini with new dataset list
        send_alert_email(new_entries)
    
    return catalogue

# Add to crontab:
# 0 2 * * 1 python scripts/aikosh_discovery.py   (every Monday 2am)
```

---

---

## 2. AIKosh Datasets — Free Tier

> All datasets below are available on AIKosh. Access = register free account.
> License must be verified per dataset before commercial redistribution.

---

### 2.1 KCC Dataset — Kisan Voice AI

| Field | Detail |
|---|---|
| **App** | Kisan Voice AI |
| **Name** | Kisan Call Centre (KCC) Q&A Dataset |
| **Size** | 2.4M+ farmer Q&A pairs |
| **Languages** | Hindi, English, regional languages |
| **Sectors** | Agriculture — crop advisory, pest management, soil, weather, schemes |
| **Source** | AIKosh (sourced from PM-KSY / DACFW) |
| **Format** | CSV |
| **Usage** | One-time download → `data/kcc_raw/` → `ingest_kcc.py` → ChromaDB |
| **Auto-fetch** | ChromaDB queried on every voice call (RAG) |
| **Update frequency** | Periodic AIKosh updates — re-run ingest when new version published |

**Ingestion script:**
```python
# data/ingest_kcc.py
import chromadb, csv, os
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("kcc_qa")

def ingest_kcc(csv_path: str = "data/kcc_raw/kcc_dataset.csv"):
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch_docs, batch_ids, batch_metas = [], [], []
        
        for i, row in enumerate(reader):
            question = row.get("question", row.get("QueryText", ""))
            answer   = row.get("answer", row.get("KccAns", ""))
            if not question or not answer:
                continue
            
            batch_docs.append(f"Q: {question}\nA: {answer}")
            batch_ids.append(f"kcc_{i}")
            batch_metas.append({
                "crop": row.get("StateName", ""),
                "category": row.get("QueryType", ""),
                "language": row.get("language", "hi")
            })
            
            if len(batch_docs) >= 500:
                embeddings = model.encode(batch_docs).tolist()
                collection.add(documents=batch_docs, ids=batch_ids,
                               metadatas=batch_metas, embeddings=embeddings)
                batch_docs, batch_ids, batch_metas = [], [], []
                print(f"Ingested {i} records...")
        
        if batch_docs:
            embeddings = model.encode(batch_docs).tolist()
            collection.add(documents=batch_docs, ids=batch_ids,
                           metadatas=batch_metas, embeddings=embeddings)
    
    print(f"KCC ingestion complete. Total: {collection.count()} records.")

if __name__ == "__main__":
    ingest_kcc()

# Run: python data/ingest_kcc.py
# Cron: re-run monthly to pick up AIKosh KCC updates
```

**RAG query function:**
```python
def get_best_answer(query: str, language: str = "hi", n_results: int = 3) -> str:
    query_embedding = model.encode([query]).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=n_results)
    
    if not results["documents"][0]:
        return "माफ़ करें, इस प्रश्न का उत्तर मुझे नहीं मिला। कृपया KCC हेल्पलाइन 1800-180-1551 पर कॉल करें।"
    
    # Return top answer
    top_doc = results["documents"][0][0]
    answer = top_doc.split("A:")[-1].strip() if "A:" in top_doc else top_doc
    return answer
```

---

### 2.2 AgriKosh Datasets — Kisan Voice AI (supplement)

| Field | Detail |
|---|---|
| **App** | Kisan Voice AI |
| **Name** | AgriKosh — Crop Disease, Soil & Weather datasets |
| **Source** | AIKosh (Agriculture sector) |
| **Usage** | Supplement KCC ChromaDB for richer, more specific answers |
| **Format** | CSV / JSON |
| **Auto-fetch** | Loaded into ChromaDB at startup; queried on each voice call |
| **Action** | Browse AIKosh Agriculture sector → download all relevant CSVs |

---

### 2.3 All-India Pincode Directory — PinAI

| Field | Detail |
|---|---|
| **App** | PinAI |
| **Name** | All India Pincode Directory |
| **Records** | 19,000+ pincodes |
| **Fields** | Pincode, district, state, taluka, office name, delivery status, lat/lng |
| **Source** | AIKosh (Department of Posts / IndiaPost) |
| **Format** | CSV |
| **Usage** | One-time load to SQLite at startup via `data/setup_db.py` |
| **Auto-fetch** | SQLite queried on every `/query` request |
| **Update** | Re-download from AIKosh quarterly (pincodes change with postal reorganisation) |

---

### 2.4 Census District Polygons & Demographic Data — PinAI

| Field | Detail |
|---|---|
| **App** | PinAI |
| **Name** | Census 2011 District-level Data + Population Proxy |
| **Fields** | District, state, rural/urban population, literacy rate, sex ratio, household count |
| **Source** | AIKosh (Census India) |
| **Format** | CSV |
| **Note** | Census 2011 — label data vintage clearly in UI. Next census data expected 2025–26. |
| **Usage** | JOIN with pincode → district mapping on each query |
| **Auto-fetch** | SQLite join on every `/query` |

---

### 2.5 Aadhaar Pincode Saturation — PinAI

| Field | Detail |
|---|---|
| **App** | PinAI |
| **Name** | Aadhaar Monthly Saturation Update |
| **Fields** | Pincode, total Aadhaar holders, % saturation |
| **Source** | UIDAI (uidai.gov.in) open data portal — also indexed on AIKosh |
| **Update frequency** | Monthly |
| **Usage** | Auto-refresh via monthly cron → reload SQLite table |
| **License** | **Verify UIDAI ToS for commercial use before launch** |
| **Auto-fetch** | Monthly cron re-downloads CSV → reloads `aadhaar_saturation` SQLite table |

**Monthly refresh cron:**
```python
# scripts/refresh_aadhaar.py
import httpx, sqlite3, csv, io

AADHAAR_URL = "https://uidai.gov.in/images/opendata/aadhaar-saturation-data.csv"

async def refresh_aadhaar():
    async with httpx.AsyncClient() as client:
        resp = await client.get(AADHAAR_URL, follow_redirects=True)
        resp.raise_for_status()
    
    conn = sqlite3.connect("data/pinai.db")
    conn.execute("DELETE FROM aadhaar_saturation")
    
    reader = csv.DictReader(io.StringIO(resp.text))
    rows = [(r["pincode"], r["count"], r["saturation_pct"]) for r in reader]
    conn.executemany(
        "INSERT INTO aadhaar_saturation(pincode, count, saturation_pct) VALUES (?,?,?)",
        rows
    )
    conn.commit()
    conn.close()
    print(f"Aadhaar data refreshed: {len(rows)} pincodes updated.")

# Crontab: 0 3 1 * * python scripts/refresh_aadhaar.py  (1st of each month, 3am)
```

---

### 2.6 Law & Justice Datasets — VaadVivaad

| Field | Detail |
|---|---|
| **App** | VaadVivaad |
| **Name** | Indian Case Law Summaries + Consumer Forum Judgements |
| **Source** | AIKosh (Legal & Justice sector) |
| **Usage** | Load to ChromaDB → inject as RAG context into Sarvam-105B dispute prompts |
| **Auto-fetch** | ChromaDB queried on each dispute filing to enrich AI resolution |

**RAG injection for dispute resolution:**
```python
LAW_COLLECTION = chroma_client.get_or_create_collection("indian_law")

def enrich_dispute_with_precedents(description: str) -> str:
    """Fetch relevant legal precedents to inject into Sarvam-105B prompt."""
    results = LAW_COLLECTION.query(
        query_texts=[description],
        n_results=3
    )
    precedents = "\n\n".join(results["documents"][0]) if results["documents"][0] else ""
    return f"""Relevant legal precedents:\n{precedents}\n\nDispute:\n{description}"""
```

---

### 2.7 How to Download AIKosh Datasets

```
1. Go to: https://aikosh.indiaai.gov.in/home/datasets
2. Use filters: Sector → Agriculture / Legal & Justice / Geography / Language
3. Click dataset → check License (Open = immediate download, Registered = login required)
4. Download CSV/JSON → place in app's data/ folder
5. Run ingestion script (ingest_kcc.py, setup_db.py, etc.)
6. Record dataset version + download date in data/README.md for audit trail
```

---

---

## 3. Bhashini — Free Government Language APIs

> **Platform:** [bhashini.gov.in](https://bhashini.gov.in) (Govt) + [bhashini.ai](https://bhashini.ai) (commercial)
> **Initiative:** National Language Translation Mission, MeitY, Government of India
> **Free tier (bhashini.gov.in):** Free for non-commercial / B2G / research use
> **Paid tier (bhashini.ai):** ₹250/mo for up to 50,000 chars/day TTS; commercial use

---

### 3.1 Bhashini ASR (Speech-to-Text) — Kisan Voice AI

| Field | Detail |
|---|---|
| **App** | Kisan Voice AI |
| **Purpose** | Convert farmer's spoken Hindi/regional language to text |
| **Languages** | Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Urdu, Bhojpuri, Kannada, Odia, Malayalam, Punjabi, Chhattisgarhi, Assamese, Maithili, Magahi, Santali, Kashmiri, Nepali, Dogri, Konkani, Manipuri, Bodo, Sanskrit |
| **API** | Bhashini ULCA pipeline API (`bhashini.gov.in/ulca`) |
| **Cost** | Free for B2G/government deployment; ₹30/hr for commercial via bhashini.ai |
| **Auto-fetch** | Called on every Twilio `/voice/process` webhook with farmer audio |
| **Registration** | bhashini.gov.in → Meity Bhashini API access |

**Integration (Bhashini ULCA pipeline):**
```python
import httpx, os, base64

BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID")
BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY")
# Pipeline ID for Hindi ASR (from Bhashini dashboard):
BHASHINI_PIPELINE_ID = os.getenv("BHASHINI_PIPELINE_ID", "64392f96daac500b55c543cd")
ULCA_BASE = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

async def transcribe_audio(audio_base64: str, source_language: str = "hi") -> str:
    payload = {
        "pipelineTasks": [{
            "taskType": "asr",
            "config": {
                "language": {"sourceLanguage": source_language},
                "serviceId": "",
                "audioFormat": "wav",
                "samplingRate": 8000
            }
        }],
        "inputData": {
            "audio": [{"audioContent": audio_base64}]
        }
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(ULCA_BASE, json=payload, headers={
            "userID": BHASHINI_USER_ID,
            "ulcaApiKey": BHASHINI_API_KEY,
            "Content-Type": "application/json"
        })
        resp.raise_for_status()
    result = resp.json()
    return result["pipelineResponse"][0]["output"][0]["source"]
```

---

### 3.2 Bhashini TTS (Text-to-Speech) — Kisan Voice AI

| Field | Detail |
|---|---|
| **App** | Kisan Voice AI |
| **Purpose** | Convert AI answer text back to farmer's spoken language |
| **Languages** | Same 22+ as ASR above |
| **API** | Bhashini ULCA TTS pipeline or bhashini.ai REST API |
| **Cost** | Free (govt); ₹250/mo (commercial via bhashini.ai) |
| **Streaming** | WebSocket streaming TTS available (bhashini.ai) for low-latency call center use |
| **Auto-fetch** | Called after every KCC RAG answer to produce audio for Twilio `<Play>` |

**TTS integration:**
```python
async def text_to_speech(text: str, target_language: str = "hi") -> str:
    """Returns base64 audio string for use in Twilio TwiML."""
    payload = {
        "pipelineTasks": [{
            "taskType": "tts",
            "config": {
                "language": {"sourceLanguage": target_language},
                "serviceId": "",
                "gender": "female",
                "samplingRate": 8000
            }
        }],
        "inputData": {
            "input": [{"source": text}]
        }
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(ULCA_BASE, json=payload, headers={
            "userID": BHASHINI_USER_ID,
            "ulcaApiKey": BHASHINI_API_KEY,
            "Content-Type": "application/json"
        })
        resp.raise_for_status()
    audio_b64 = resp.json()["pipelineResponse"][0]["audio"][0]["audioContent"]
    return audio_b64  # decode and serve as .wav for Twilio

# Twilio: <Play> the audio URL or encode as TwiML <Say> fallback
```

---

### 3.3 Bhashini Translation — Optional for all apps

| Field | Detail |
|---|---|
| **Apps** | VaadVivaad (multilingual disputes), DocPatram (vernacular document input) |
| **Purpose** | Translate regional language input to Hindi/English before model call |
| **Languages** | 22 Indian languages ↔ English/Hindi |
| **API** | Bhashini ULCA translation pipeline |
| **Cost** | Free (govt) / ₹20/10K chars commercial (bhashini.ai) |

**Translation integration:**
```python
async def translate_text(text: str, source_lang: str, target_lang: str = "en") -> str:
    payload = {
        "pipelineTasks": [{
            "taskType": "translation",
            "config": {
                "language": {
                    "sourceLanguage": source_lang,
                    "targetLanguage": target_lang
                },
                "serviceId": ""
            }
        }],
        "inputData": {"input": [{"source": text}]}
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(ULCA_BASE, json=payload, headers={
            "userID": BHASHINI_USER_ID,
            "ulcaApiKey": BHASHINI_API_KEY,
        })
        resp.raise_for_status()
    return resp.json()["pipelineResponse"][0]["output"][0]["target"]
```

---

### 3.4 Bhashini OCR — Optional for DocPatram

| Field | Detail |
|---|---|
| **App** | DocPatram |
| **Purpose** | Indic-language OCR on uploaded images/PDFs |
| **API** | `POST /v1/ocr` on bhashini.ai (X-API-KEY header) |
| **Languages** | Hindi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Odia, Punjabi, Urdu |
| **Cost** | Free within daily character limits; paid for higher volume |
| **Primary** | AIKosh OCR Toolkit (primary); Bhashini OCR (fallback / supplement) |

---

### 3.5 Bhashini Registration

```
FREE (B2G / Research / Non-commercial):
1. Go to: https://bhashini.gov.in
2. Click "For Developers" → Register
3. Fill organisation type: "Startup / Independent Developer"
4. Apply for ULCA API access
5. Receive: BHASHINI_USER_ID + BHASHINI_API_KEY
6. Add to .env

COMMERCIAL (bhashini.ai — if B2G registration insufficient):
1. Go to: https://bhashini.ai
2. Register → Subscribe ₹250/mo (50K chars/day TTS)
3. API docs: https://www.bhashini.ai/docs
4. For voice call center: use WebSocket streaming TTS endpoint
```

---

---

## 4. Sarvam AI — Free Tier Models

> **Platform:** [sarvam.ai](https://www.sarvam.ai)
> **Free signup:** ₹1,000 free credits on every new account
> **Startup programme:** Free API credits for 12 months for Indian founders — apply at sarvam.ai/startup
> **Pricing:** Pay-per-use after credits. STT ₹30/hr, TTS ₹15–30/10K chars, Translation ₹20/10K chars.

---

### 4.1 Sarvam-M (Free) via OpenRouter — VaadVivaad Fallback

| Field | Detail |
|---|---|
| **App** | VaadVivaad |
| **Model** | `sarvamai/sarvam-m:free` |
| **Provider** | OpenRouter (openrouter.ai) |
| **Cost** | Completely free — ₹0 per 1M input + output tokens |
| **Context** | 33K output tokens |
| **Capabilities** | Complex reasoning, chain-of-thought, tool calling, open weights |
| **Use** | Primary free fallback if Sarvam-105B AIKosh quota hit |
| **Auto-fetch** | Called when Sarvam-105B throws an error or rate limit |

```python
# .env
OPENROUTER_API_KEY=sk-or-...

# Usage
async def sarvam_m_free(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json={
                "model": "sarvamai/sarvam-m:free",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1000
            },
            headers={
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "HTTP-Referer": "https://ayojit-intelligence.com",
                "X-Title": "Ayojit Intelligence"
            }
        )
        resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]
```

---

### 4.2 Sarvam AI Named Models (Free credits on signup)

| Model | Purpose | Free tier |
|---|---|---|
| **Saaras** (STT + Translation) | Speech → translated text directly. Auto language detection. | ₹1,000 credits on signup |
| **Bulbul** (TTS) | Hindi + 6 Indian voice personas. Domain-specific pronunciation. | ₹1,000 credits |
| **Mayura** (Translation) | Colloquial Hindi ↔ 10 Indian languages. Formal + informal. | ₹1,000 credits |
| **Sarvam Vision** | Multimodal — document OCR + understanding | Was free Feb 2026 (promotion ended); check current status |

**Recommended for Kisan Voice AI (if Bhashini key delayed):**
- Use Saaras for ASR (auto-detects farmer language + translates to Hindi)
- Use Bulbul for TTS (play answer back in farmer's language)
- Pair with ₹1,000 free credits → apply to startup programme for 12 months free

```python
# Sarvam Saaras STT
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

async def sarvam_stt(audio_bytes: bytes) -> dict:
    """Returns {transcript, language_detected}"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.sarvam.ai/speech-to-text-translate",
            files={"file": ("audio.wav", audio_bytes, "audio/wav")},
            data={"model": "saaras:v1"},
            headers={"api-subscription-key": SARVAM_API_KEY}
        )
        resp.raise_for_status()
    data = resp.json()
    return {"transcript": data["transcript"], "language": data.get("language_code", "hi")}

# Sarvam Bulbul TTS
async def sarvam_tts(text: str, language: str = "hi-IN", speaker: str = "meera") -> bytes:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            json={
                "inputs": [text],
                "target_language_code": language,
                "speaker": speaker,  # options: meera, pavithra, maitreyi, etc.
                "model": "bulbul:v1",
                "enable_preprocessing": True
            },
            headers={"api-subscription-key": SARVAM_API_KEY}
        )
        resp.raise_for_status()
    import base64
    return base64.b64decode(resp.json()["audios"][0])
```

---

### 4.3 Sarvam Startup Programme

```
Apply for 12 months FREE API credits:
1. Go to: https://www.sarvam.ai
2. Click "Startup Programme" or contact via website
3. Provide: startup stage, projected API usage, tech requirements
4. If selected: free credits for 12 months + direct engineering support + co-branding

Eligibility signals for Ayojit Intelligence:
- Indian founder ✓
- B2G use case (Kisan Voice AI) ✓
- Vernacular-first product ✓
- IndiaAI Mission alignment ✓
```

---

---

## 5. Free Hosting & Infrastructure

### 5.1 Full Free Hosting Stack

| Component | Service | Free Tier Details | Notes |
|---|---|---|---|
| Frontend (all 5 apps) | **Vercel** | Unlimited deploys, 100GB bandwidth/mo | One Next.js project, route groups for 5 apps |
| Backend × 4 | **Render.com** | 750 hrs/mo per service (≈1 service running full-time) | FastAPI for PinAI, DocPatram, VaadVivaad, Kisan Voice AI |
| HindiDiff model + backend | **Hugging Face Spaces** | Free CPU; $9/mo T4 GPU upgrade | Docker Space hosts Baaz-v1 + FastAPI |
| Database + Auth | **Supabase** | 500MB Postgres, 50K MAU, 1GB storage, free TLS | One shared project covers all 5 apps |
| Image/file storage | **Cloudinary** | 25GB storage, 25GB bandwidth/mo | HindiDiff generated images, DocPatram outputs |
| Payments | **Razorpay** | No fixed cost; ~2% per transaction | UPI + cards + net banking; webhook verification free |
| Voice telephony | **Twilio** | $15 trial credit | Only paid component for Kisan Voice AI; B2G contract covers |
| UI component library | **Neo-Brutalism UI** | MIT license | [neo-brutalism-ui-library.vercel.app](https://neo-brutalism-ui-library.vercel.app) |
| CSS framework | **Tailwind CSS** | MIT license | Bundled with Next.js |
| Vector DB | **ChromaDB** | MIT license, self-hosted | Kisan Voice AI + VaadVivaad RAG |
| LLM inference routing | **OpenRouter** | Free tier (Sarvam-M free) | Fallback model routing |

**Total fixed monthly cost at MVP: ₹0** (excluding Twilio B2G cost passed to contract)

---

### 5.2 Render.com — FastAPI Deployment

```yaml
# render.yaml (per app)
services:
  - type: web
    name: pinai-backend
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt --break-system-packages
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: SUPABASE_JWT_SECRET
        sync: false

# Keep-alive ping (prevents 15-min sleep on free tier):
# Add to /scripts/keepalive.py and run as separate cron job
# OR use UptimeRobot free tier to ping service URL every 5 min
```

---

### 5.3 Supabase — Shared Setup

```sql
-- One project covers all 5 apps
-- Free tier limits:
--   500MB DB storage
--   50,000 MAU
--   1GB file storage
--   2GB bandwidth
--   Unlimited API requests

-- Check usage at: app.supabase.com → Project → Usage
-- Upgrade to Pro ($25/mo) only when approaching limits
```

---

### 5.4 Cloudinary — File Storage Setup

```python
# Signed upload (never expose API secret to client)
import cloudinary, cloudinary.uploader, os

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

async def upload_image(image_bytes: bytes, folder: str, filename: str) -> str:
    """Upload image to Cloudinary, return public URL."""
    result = cloudinary.uploader.upload(
        image_bytes,
        folder=folder,             # e.g. "hindidiff" or "docpatram"
        public_id=filename,
        resource_type="auto",
        overwrite=False
    )
    return result["secure_url"]

# Free tier: 25GB storage + 25GB bandwidth/month
# Monitor at: cloudinary.com/console → Usage
```

---

---

## 6. Free Supporting APIs & Tools

### 6.1 Sentence Transformers — Multilingual Embeddings (All RAG apps)

| Field | Detail |
|---|---|
| **Apps** | Kisan Voice AI, VaadVivaad |
| **Model** | `paraphrase-multilingual-mpnet-base-v2` |
| **Source** | Hugging Face (sentence-transformers library) |
| **Cost** | Free, runs locally / on Render |
| **Purpose** | Generate vector embeddings for ChromaDB RAG (multilingual: covers Hindi + regional) |
| **Install** | `pip install sentence-transformers` |

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
embeddings = model.encode(["यह एक हिन्दी वाक्य है"]).tolist()
```

---

### 6.2 ChromaDB — Vector Database (Kisan Voice AI, VaadVivaad)

| Field | Detail |
|---|---|
| **Apps** | Kisan Voice AI (KCC RAG), VaadVivaad (law precedent RAG) |
| **Cost** | Free, MIT license, self-hosted |
| **Storage** | Persisted to local disk on Render (ephemeral — rebuild on cold start) |
| **Solution** | Pre-build ChromaDB and include in Docker image, OR use Render persistent disk ($1/GB/mo) |
| **Install** | `pip install chromadb` |

```python
import chromadb
client = chromadb.PersistentClient(path="./chroma_db")
# Include chroma_db/ in Docker image or rebuild on startup from CSV
```

---

### 6.3 Pydantic — Input Validation (All 5 apps)

```python
# Required on every endpoint. Free, MIT license.
from pydantic import BaseModel, validator, constr
import re

class HindiDiffRequest(BaseModel):
    prompt: constr(max_length=500)
    style: Literal["art", "traditional", "realistic", "anime", "miniature"]
    size: Literal["square", "portrait", "landscape"]
    variations: Literal[1, 2, 4]

    @validator("prompt")
    def sanitize_prompt(cls, v):
        # Strip injection patterns
        v = re.sub(r"[<>\"';]", "", v)
        v = re.sub(r"(script|onclick|onerror|javascript)", "", v, flags=re.I)
        return v.strip()

class PinAIRequest(BaseModel):
    pincode: constr(regex=r"^\d{6}$")  # exactly 6 digits
    query: constr(max_length=200)

    @validator("query")
    def sanitize_query(cls, v):
        # Strip SQL injection
        patterns = [r"('|\")", r"(--|;)", r"(DROP|SELECT|INSERT|DELETE|UPDATE)", r"(<script)"]
        for p in patterns:
            v = re.sub(p, "", v, flags=re.I)
        return v.strip()
```

---

### 6.4 Slowapi — Rate Limiting (All 5 backends)

```python
# Free, MIT license
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Usage per endpoint:
@app.post("/generate")
@limiter.limit("5/minute")  # HindiDiff: 5 req/min/IP
async def generate(request: Request, ...):
    ...

# Per-app limits from Security Checklist:
# HindiDiff:    5/min/IP
# PinAI:       10/min/IP
# DocPatram:    5/min/IP
# VaadVivaad:   3/min/IP
# Kisan Voice:  applied at Twilio level (webhook signatures)
```

---

### 6.5 Bleach — XSS Sanitization (DocPatram, VaadVivaad)

```python
# Free, MIT license
import bleach

def sanitize_html(text: str) -> str:
    """Strip all HTML tags and attributes. Use on OCR output and dispute descriptions."""
    return bleach.clean(text, tags=[], attributes={}, strip=True)

# Usage in DocPatram:
ocr_text = sanitize_html(raw_ocr_output)  # before DB insert or UI render

# Usage in VaadVivaad:
clean_description = sanitize_html(dispute_description)  # before Sarvam call
```

---

### 6.6 python-magic — MIME Validation (DocPatram)

```python
# Free, LGPL license
import magic

ALLOWED_MIMES = {"application/pdf", "image/png", "image/jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_file(file_bytes: bytes, declared_mime: str) -> None:
    # Check actual content, not just extension or declared mime
    actual_mime = magic.from_buffer(file_bytes, mime=True)
    if actual_mime not in ALLOWED_MIMES:
        raise HTTPException(415, f"File type not allowed: {actual_mime}")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(413, "File exceeds 10MB limit")
    # Reject macro-embedded content
    if actual_mime == "application/pdf" and b"%macro" in file_bytes[:1000]:
        raise HTTPException(415, "Embedded macros not allowed")
```

---

### 6.7 Twilio (Kisan Voice AI)

| Field | Detail |
|---|---|
| **App** | Kisan Voice AI |
| **Purpose** | Inbound voice call webhook; STT → FastAPI → TTS → response |
| **Cost** | $15 free trial credit; ~$0.01/min after; B2G contract covers |
| **Webhook security** | `X-Twilio-Signature` HMAC-SHA1 validation on every request |
| **India DID** | Indian +91 DID requires TRAI DLT registration — start process early |

```python
from twilio.request_validator import RequestValidator
import os

TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
validator = RequestValidator(TWILIO_AUTH_TOKEN)

def validate_twilio_signature(request_url: str, post_params: dict, signature: str) -> bool:
    return validator.validate(request_url, post_params, signature)

# In FastAPI route:
@app.post("/voice/inbound")
async def voice_inbound(request: Request):
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    form = dict(await request.form())
    
    if not validate_twilio_signature(url, form, signature):
        raise HTTPException(403, "Invalid Twilio signature")
    
    # Return TwiML welcome
    return Response(content="""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/voice/process" language="hi-IN" speechTimeout="3">
    <Say language="hi-IN">नमस्ते, मैं किसान AI हूँ। अपना कृषि प्रश्न बोलें।</Say>
  </Gather>
</Response>""", media_type="text/xml")
```

---

### 6.8 Claude API — PinAI NL Insights + DocPatram Fallback

| Field | Detail |
|---|---|
| **Apps** | PinAI (NL insight layer), DocPatram (fallback if Patram-7B down) |
| **Model** | `claude-sonnet-4-6` |
| **Cost** | Paid — cache PinAI responses per pincode (24hr TTL) to minimise calls |
| **Free alternative** | None for quality NL summaries — budget ₹2,000/mo and cache aggressively |
| **Install** | `pip install anthropic` |

```python
import anthropic, os

claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# PinAI: NL insight (cache by pincode, 24hr TTL)
INSIGHT_CACHE: dict = {}  # replace with Redis in production

async def get_pincode_insight(pincode: str, data: dict) -> str:
    if pincode in INSIGHT_CACHE:
        return INSIGHT_CACHE[pincode]
    
    message = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": f"""
Given this pincode data for {pincode}:
District: {data['district']}, State: {data['state']}
Population proxy: {data.get('population', 'N/A')}
Aadhaar saturation: {data.get('aadhaar_pct', 'N/A')}%

Write a 2-sentence business intelligence insight for an entrepreneur or NBFC
considering this area. Be specific and practical. No markdown.
"""}]
    )
    insight = message.content[0].text
    INSIGHT_CACHE[pincode] = insight  # cache 24hr
    return insight
```

---

---

## 7. Auto-Fetch Strategy — Keep Resources Current

### 7.1 On Every Request (real-time)

| Trigger | What runs |
|---|---|
| POST `/generate` (HindiDiff) | Baaz-v1 on HF Spaces → Cloudinary upload → Supabase insert |
| POST `/query` (PinAI) | SQLite lookup → Claude NL insight (cached) → response |
| POST `/generate-doc` (DocPatram) | Patram-7B → OCR Toolkit → Cloudinary upload → Supabase insert |
| POST `/file-dispute` (VaadVivaad) | lifetime_usage check → Sarvam-105B → law RAG → Supabase insert |
| POST `/voice/inbound` (Kisan Voice AI) | Twilio validate → Bhashini ASR → KCC ChromaDB RAG → Bhashini TTS |

### 7.2 Monthly Cron Jobs

```cron
# Crontab entries (add to Render cron job or GitHub Actions scheduled workflow)

# Refresh Aadhaar saturation data (PinAI)
0 3 1 * * python scripts/refresh_aadhaar.py

# Re-ingest KCC dataset if AIKosh published new version (Kisan Voice AI)
0 4 1 * * python scripts/check_kcc_update.py

# Refresh Bhashini pipeline IDs (language API version check)
0 2 1 * * python scripts/refresh_bhashini_pipelines.py
```

### 7.3 Weekly Cron — AIKosh Catalogue Discovery

```cron
# Check for new datasets/models on AIKosh every Monday 2am
0 2 * * 1 python scripts/aikosh_discovery.py
```

### 7.4 HuggingFace Model Webhook — Auto-detect Model Updates

```python
# scripts/hf_webhook_handler.py
# Set up at: huggingface.co/settings/webhooks → add your Render URL
# Triggers when: Baaz-v1, Patram-7B, or any watched model is updated

from fastapi import APIRouter, Request
router = APIRouter()

WATCHED_MODELS = ["baaz-v1", "patram-7b", "sarvam-105b"]

@router.post("/webhooks/hf-model-update")
async def hf_model_update(request: Request):
    data = await request.json()
    model_id = data.get("repo", {}).get("name", "")
    
    if any(m in model_id.lower() for m in WATCHED_MODELS):
        # Notify Ashwini — do NOT auto-swap model without human approval
        await send_email_alert(
            subject=f"AIKosh model updated: {model_id}",
            body=f"New version available. Review before swapping inference endpoint.\n{data}"
        )
    
    return {"status": "received"}
```

### 7.5 Render Keep-Alive (Prevent Free Tier Sleep)

```python
# Use UptimeRobot (free tier, 50 monitors) to ping each Render service URL
# every 5 minutes. Prevents the 15-min sleep on free tier.
# 
# URLs to monitor:
# https://pinai-backend.onrender.com/health
# https://docpatram-backend.onrender.com/health
# https://vaadvivaad-backend.onrender.com/health
# https://kisan-voice-ai-backend.onrender.com/health

@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

---

## 8. Registration Checklist

Complete these registrations before starting the build. All free.

```
PRIORITY 1 — Block build without these:
[ ] Supabase — app.supabase.com → New project
[ ] Vercel — vercel.com → Import repo
[ ] Render.com — render.com → New web service × 4
[ ] Razorpay TEST MODE — razorpay.com → Dashboard → test keys
[ ] Cloudinary — cloudinary.com → Free account
[ ] HuggingFace — huggingface.co → account (for Spaces + model downloads)

PRIORITY 2 — Register within 1 week:
[ ] AIKosh — aikosh.indiaai.gov.in → Register → request model access (Baaz-v1, Patram-7B, Sarvam-105B)
[ ] Bhashini — bhashini.gov.in → Developer registration → ULCA API key
[ ] Sarvam AI — sarvam.ai → Register → get ₹1,000 free credits
[ ] OpenRouter — openrouter.ai → API key (for Sarvam-M free fallback)
[ ] Anthropic — console.anthropic.com → API key (for PinAI NL insights + DocPatram fallback)

PRIORITY 3 — Before B2G launch:
[ ] Twilio — twilio.com → account → $15 trial credit → India DID TRAI registration
[ ] Razorpay LIVE MODE — submit KYC documents → activate live keys
[ ] Sarvam Startup Programme — sarvam.ai/startup → apply for 12mo free credits
[ ] Bhashini Commercial (if needed) — bhashini.ai → ₹250/mo TTS subscription
[ ] UptimeRobot — uptimerobot.com → Free account → 50 monitors → ping all Render services
```

---

---

## 9. License Verification Checklist

**CRITICAL — Verify before commercial launch. AIKosh has 3 license tiers.**

```
For each resource, check the artefact page on AIKosh for:
  - License type: Open / Registered / Restricted
  - Commercial use: Allowed / Not allowed / Case-by-case
  - Attribution required: Yes/No
  - Redistribution allowed: Yes/No

[ ] Baaz-v1 — aikosh.indiaai.gov.in/models/baaz-v1
    License: ___________  Commercial: ___________

[ ] Patram-7B — aikosh.indiaai.gov.in/models/patram-7b
    License: ___________  Commercial: ___________

[ ] Sarvam-105B — aikosh.indiaai.gov.in/models/sarvam-105b
    License: ___________  Commercial: ___________

[ ] KCC Dataset — aikosh.indiaai.gov.in/datasets/kcc
    License: ___________  Commercial: ___________

[ ] Pincode Directory — aikosh.indiaai.gov.in/datasets/pincode
    License: ___________  Commercial: ___________

[ ] Census Data — aikosh.indiaai.gov.in/datasets/census
    License: ___________  Commercial: ___________

[ ] AgriKosh datasets — aikosh.indiaai.gov.in/datasets (Agriculture sector)
    License: ___________  Commercial: ___________

[ ] Law & Justice datasets — aikosh.indiaai.gov.in/datasets (Legal sector)
    License: ___________  Commercial: ___________

[ ] Aadhaar Saturation — uidai.gov.in open data
    License: ___________  Commercial: ___________

[ ] Bhashini ULCA — bhashini.gov.in ToS
    Non-commercial: Free  Commercial: bhashini.ai ₹250/mo

[ ] Sarvam AI API — sarvam.ai ToS
    Standard SaaS ToS — commercial use allowed with paid plan

[ ] Sarvam-M (OpenRouter) — sarvamai/sarvam-m HF model card
    License: ___________  Commercial: ___________
```

> **Rule:** If license says "Restricted" or "Non-commercial only" — do NOT ship that feature commercially until you get written permission from AIKosh/model owner. Use fallback instead.

---

---

## 10. Cost Summary — What Is Actually Free vs Paid

### Free (₹0/month at MVP scale)

| Resource | Service |
|---|---|
| Auth + Database + RLS | Supabase free tier |
| Frontend hosting | Vercel free tier |
| Backend hosting × 4 | Render.com free tier |
| HindiDiff model + backend | HuggingFace Spaces (CPU) |
| Image storage | Cloudinary free tier |
| Baaz-v1 model inference | HF Spaces self-hosted |
| Patram-7B model inference | AIKosh API (registered free) |
| Sarvam-105B | AIKosh API (registered free) |
| Sarvam-M fallback | OpenRouter free tier |
| KCC Dataset, AgriKosh, Pincode, Census, Law datasets | AIKosh registered free |
| Bhashini ASR/TTS | bhashini.gov.in (B2G free) |
| Sentence Transformers | Self-hosted on Render |
| ChromaDB | Self-hosted on Render |
| Pydantic, Slowapi, Bleach, python-magic | MIT libraries |
| Neo-Brutalism UI + Tailwind | MIT license |
| Sarvam AI free credits | ₹1,000 on signup |
| Sarvam Startup Programme | 12 months free (if selected) |
| OpenRouter | Free (Sarvam-M) |
| UptimeRobot keep-alive | Free (50 monitors) |

### Paid (scale-triggered or B2G-covered)

| Resource | Cost | When triggered |
|---|---|---|
| Razorpay | ~2% per transaction | When users pay — self-funding |
| Anthropic (Claude API) | ~₹2,000/mo | PinAI NL insights; cache aggressively |
| Twilio voice | ~$0.01/min | Kisan Voice AI — pass cost to B2G contract |
| HF Spaces T4 GPU | $9/mo | Only if HindiDiff free CPU too slow at scale |
| Bhashini.ai commercial | ₹250/mo | Only if B2G registration insufficient |
| Supabase Pro | $25/mo | Only when approaching 500MB DB or 50K MAU |
| Render paid tier | $7/mo per service | Only when sleep time becomes a revenue issue |

**Estimated month-1 cash cost:** ₹2,000–₹5,000 (Claude API only, all else free)
**Break-even:** ~7–17 paid PinAI users (₹299/mo) cover Claude API cost
**At 500 paid users across apps: ~₹1L MRR vs <₹10K infra costs**

---

*Document generated from AIKosh MVP Masterplan, EXECUTION_PROMPTS.md, Bhashini API docs, Sarvam AI docs, and live AIKosh catalogue (June 2026). Verify all registration links and license terms at time of use — platform policies change.*
