# AIKosh MVP Codebases — All 5 Ideas
> Built on Paul Graham's principle: Make something people love, use free resources, grow exponentially.
> All stacks use free AIKosh datasets/models + free hosting. Zero upfront cost.

---

# Table of Contents
1. [Kisan Voice AI](#1-kisan-voice-ai)
2. [PinAI — Hyperlocal Business Intelligence](#2-pinai)
3. [DocPatram — Indian Government Document AI](#3-docpatram)
4. [VaadVivaad — AI Dispute Resolution](#4-vaadvivaad)
5. [HindiDiff — Hindi Text-to-Image](#5-hindidiff)

---

# 1. Kisan Voice AI

> Farmer helpline in 22 Indian languages using AIKosh KCC dataset + Bhashini API.
> **Earn:** B2G contracts with state agriculture departments. First product to earn ₹10L–₹2Cr.

## Architecture

```
Farmer Phone Call
      ↓
Twilio / Exotel (missed call trigger, free tier)
      ↓
FastAPI Backend (Railway.app — free)
      ↓
┌─────────────────────────────────────┐
│  Bhashini Pipeline (Free Govt API)  │
│  ASR → Translate → NLP → TTS       │
└─────────────────────────────────────┘
      ↓
KCC Dataset RAG (ChromaDB — free, local)
      ↓
Response in farmer's language via Twilio TTS
```

## File Structure

```
kisan-voice-ai/
├── app/
│   ├── main.py           # FastAPI entry point
│   ├── bhashini.py       # Bhashini API wrapper
│   ├── rag.py            # RAG over KCC dataset
│   ├── voice.py          # Twilio voice handler
│   └── models.py         # Pydantic schemas
├── data/
│   └── ingest_kcc.py     # Load KCC dataset from AIKosh
├── requirements.txt
├── Dockerfile
└── .env.example
```

## `requirements.txt`

```
fastapi==0.111.0
uvicorn==0.30.0
httpx==0.27.0
chromadb==0.5.0
sentence-transformers==3.0.0
twilio==9.1.0
python-dotenv==1.0.1
pandas==2.2.2
pydantic==2.7.0
```

## `.env.example`

```env
BHASHINI_API_KEY=your_key_here
BHASHINI_USER_ID=your_user_id
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=xxxxxx
TWILIO_PHONE_NUMBER=+1234567890
PORT=8000
```

## `app/bhashini.py` — Bhashini API Wrapper

```python
"""
Bhashini API wrapper for ASR, Translation, and TTS.
Free API from Government of India: https://bhashini.gov.in/ulca/model/explore-models
Register at: https://bhashini.gov.in/
"""
import httpx
import os
import base64
from typing import Optional

BHASHINI_BASE = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
BHASHINI_AUTH = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"

LANGUAGE_CODES = {
    "hindi": "hi",
    "bengali": "bn",
    "telugu": "te",
    "marathi": "mr",
    "tamil": "ta",
    "gujarati": "gu",
    "kannada": "kn",
    "odia": "or",
    "punjabi": "pa",
    "malayalam": "ml",
    "assamese": "as",
    "maithili": "mai",
    "english": "en",
}


async def get_pipeline_config(source_lang: str, target_lang: str = "hi") -> dict:
    """Get Bhashini pipeline config for ASR + Translation + TTS."""
    payload = {
        "pipelineTasks": [
            {"taskType": "asr", "config": {"language": {"sourceLanguage": source_lang}}},
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang,
                    }
                },
            },
            {
                "taskType": "tts",
                "config": {"language": {"sourceLanguage": target_lang}},
            },
        ],
        "pipelineRequestConfig": {"pipelineId": "64392f96daac500b55c543cd"},
    }
    headers = {
        "userID": os.getenv("BHASHINI_USER_ID"),
        "ulcaApiKey": os.getenv("BHASHINI_API_KEY"),
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(BHASHINI_AUTH, json=payload, headers=headers)
        r.raise_for_status()
        return r.json()


async def transcribe_and_translate(
    audio_base64: str,
    source_lang: str,
    target_lang: str = "en",
    pipeline_config: Optional[dict] = None,
) -> dict:
    """
    Convert farmer's voice (any Indian language) to English text.
    Returns: {"transcription": str, "translation": str}
    """
    if pipeline_config is None:
        pipeline_config = await get_pipeline_config(source_lang, target_lang)

    # Extract service endpoints from config
    config = pipeline_config.get("pipelineInferenceAPIEndPoint", {})
    callback_url = config.get("callbackUrl", BHASHINI_BASE)
    inference_key = config.get("inferenceApiKey", {})

    payload = {
        "pipelineTasks": [
            {
                "taskType": "asr",
                "config": {
                    "language": {"sourceLanguage": source_lang},
                    "serviceId": pipeline_config.get("pipelineResponseConfig", [{}])[0]
                    .get("config", [{}])[0]
                    .get("serviceId", ""),
                    "audioFormat": "wav",
                    "samplingRate": 8000,
                },
            },
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang,
                    },
                    "serviceId": pipeline_config.get("pipelineResponseConfig", [{}])[1]
                    .get("config", [{}])[0]
                    .get("serviceId", ""),
                },
            },
        ],
        "inputData": {
            "audio": [{"audioContent": audio_base64}],
            "input": None,
        },
    }

    headers = {
        inference_key.get("name", "Authorization"): inference_key.get("value", ""),
    }

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(callback_url, json=payload, headers=headers)
        r.raise_for_status()
        result = r.json()

    transcription = (
        result.get("pipelineResponse", [{}])[0]
        .get("output", [{}])[0]
        .get("source", "")
    )
    translation = (
        result.get("pipelineResponse", [{}])[1]
        .get("output", [{}])[0]
        .get("target", "")
    )
    return {"transcription": transcription, "translation": translation}


async def text_to_speech(text: str, target_lang: str = "hi") -> bytes:
    """Convert response text to audio in farmer's language."""
    pipeline_config = await get_pipeline_config(target_lang, target_lang)
    config = pipeline_config.get("pipelineInferenceAPIEndPoint", {})
    callback_url = config.get("callbackUrl", BHASHINI_BASE)
    inference_key = config.get("inferenceApiKey", {})

    payload = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {"sourceLanguage": target_lang},
                    "serviceId": pipeline_config.get("pipelineResponseConfig", [{}])[2]
                    .get("config", [{}])[0]
                    .get("serviceId", ""),
                    "gender": "female",
                    "samplingRate": 8000,
                },
            }
        ],
        "inputData": {"input": [{"source": text}], "audio": None},
    }

    headers = {
        inference_key.get("name", "Authorization"): inference_key.get("value", ""),
    }

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(callback_url, json=payload, headers=headers)
        r.raise_for_status()
        result = r.json()

    audio_b64 = (
        result.get("pipelineResponse", [{}])[0]
        .get("audio", [{}])[0]
        .get("audioContent", "")
    )
    return base64.b64decode(audio_b64)
```

## `data/ingest_kcc.py` — Load KCC Dataset from AIKosh

```python
"""
Downloads the Kisan Call Centre dataset from AIKosh and ingests it into ChromaDB.
Dataset URL: https://aikosh.indiaai.gov.in/home/datasets/all
Search for: "Kisan Call Centre Transcripts"
Download and place CSV files in ./data/kcc_raw/
"""
import os
import glob
import pandas as pd
import chromadb
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

DATA_DIR = "./data/kcc_raw"
CHROMA_DIR = "./data/chroma_kcc"
COLLECTION_NAME = "kcc_farmer_queries"
BATCH_SIZE = 100


def load_kcc_csvs() -> pd.DataFrame:
    """Load all KCC CSV files from AIKosh download."""
    files = glob.glob(f"{DATA_DIR}/*.csv")
    if not files:
        raise FileNotFoundError(
            f"No CSV files found in {DATA_DIR}. "
            "Download KCC dataset from https://aikosh.indiaai.gov.in "
            "and place CSV files in ./data/kcc_raw/"
        )
    dfs = []
    for f in files:
        try:
            df = pd.read_csv(f, encoding="utf-8", low_memory=False)
            dfs.append(df)
            print(f"Loaded {len(df)} rows from {os.path.basename(f)}")
        except Exception as e:
            print(f"Warning: Could not load {f}: {e}")
    return pd.concat(dfs, ignore_index=True)


def build_qa_pairs(df: pd.DataFrame) -> list[dict]:
    """Extract Q&A pairs from KCC transcript format."""
    qa_pairs = []
    # KCC dataset has different column names depending on the file
    # Common columns: QueryText, AnswerText, Crop, District, State, Season
    query_col = next(
        (c for c in df.columns if "query" in c.lower() or "question" in c.lower()),
        None,
    )
    answer_col = next(
        (c for c in df.columns if "answer" in c.lower() or "response" in c.lower()),
        None,
    )
    if not query_col or not answer_col:
        print(f"Available columns: {list(df.columns)}")
        raise ValueError("Cannot find query/answer columns in KCC dataset")

    for _, row in df.iterrows():
        query = str(row.get(query_col, "")).strip()
        answer = str(row.get(answer_col, "")).strip()
        if query and answer and query != "nan" and answer != "nan":
            qa_pairs.append(
                {
                    "query": query,
                    "answer": answer,
                    "crop": str(row.get("Crop", row.get("crop", ""))),
                    "district": str(row.get("District", row.get("district", ""))),
                    "state": str(row.get("State", row.get("state", ""))),
                    "season": str(row.get("Season", row.get("season", ""))),
                }
            )
    print(f"Extracted {len(qa_pairs)} Q&A pairs")
    return qa_pairs


def ingest_to_chromadb(qa_pairs: list[dict]):
    """Embed and store Q&A pairs in ChromaDB for RAG."""
    print("Loading sentence transformer model (multilingual)...")
    model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-mpnet-base-v2")

    client = chromadb.PersistentClient(path=CHROMA_DIR)
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    collection = client.create_collection(COLLECTION_NAME)

    print(f"Ingesting {len(qa_pairs)} records in batches of {BATCH_SIZE}...")
    for i in tqdm(range(0, len(qa_pairs), BATCH_SIZE)):
        batch = qa_pairs[i : i + BATCH_SIZE]
        docs = [qa["query"] for qa in batch]
        embeddings = model.encode(docs).tolist()
        ids = [f"kcc_{i+j}" for j in range(len(batch))]
        metadatas = [
            {
                "answer": qa["answer"],
                "crop": qa["crop"],
                "district": qa["district"],
                "state": qa["state"],
                "season": qa["season"],
            }
            for qa in batch
        ]
        collection.add(documents=docs, embeddings=embeddings, ids=ids, metadatas=metadatas)

    print(f"Ingestion complete. Collection has {collection.count()} records.")


if __name__ == "__main__":
    df = load_kcc_csvs()
    qa_pairs = build_qa_pairs(df)
    ingest_to_chromadb(qa_pairs)
    print("Done! Run: uvicorn app.main:app --reload")
```

## `app/rag.py` — RAG over KCC Dataset

```python
"""
Retrieval Augmented Generation over the KCC dataset.
Finds the most relevant answer from 2.4M+ farmer Q&A pairs.
"""
import chromadb
from sentence_transformers import SentenceTransformer
from functools import lru_cache

CHROMA_DIR = "./data/chroma_kcc"
COLLECTION_NAME = "kcc_farmer_queries"


@lru_cache(maxsize=1)
def get_model():
    return SentenceTransformer(
        "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
    )


@lru_cache(maxsize=1)
def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    return client.get_collection(COLLECTION_NAME)


def search_kcc(query: str, n_results: int = 3, filters: dict = None) -> list[dict]:
    """
    Search KCC dataset for relevant farmer Q&A.
    query: farmer's question (in any language, translated to English)
    Returns list of {question, answer, crop, district, confidence}
    """
    model = get_model()
    collection = get_collection()
    embedding = model.encode([query]).tolist()

    where_clause = None
    if filters:
        conditions = [
            {k: {"$eq": v}} for k, v in filters.items() if v and v != "nan"
        ]
        if conditions:
            where_clause = {"$and": conditions} if len(conditions) > 1 else conditions[0]

    results = collection.query(
        query_embeddings=embedding,
        n_results=n_results,
        where=where_clause,
        include=["documents", "metadatas", "distances"],
    )

    answers = []
    for i, doc in enumerate(results["documents"][0]):
        distance = results["distances"][0][i]
        confidence = max(0, 1 - distance)  # Convert distance to confidence score
        meta = results["metadatas"][0][i]
        answers.append(
            {
                "question": doc,
                "answer": meta["answer"],
                "crop": meta.get("crop", ""),
                "district": meta.get("district", ""),
                "confidence": round(confidence, 3),
            }
        )
    return answers


def get_best_answer(query: str, crop: str = None) -> str:
    """Get the single best answer for a farmer's query."""
    filters = {"crop": crop} if crop else None
    results = search_kcc(query, n_results=1, filters=filters)
    if not results:
        return "इस प्रश्न का उत्तर हमारे डेटाबेस में नहीं है। कृपया KCC हेल्पलाइन 1800-180-1551 पर कॉल करें।"
    best = results[0]
    if best["confidence"] < 0.3:
        return "इस प्रश्न का सटीक उत्तर नहीं मिला। कृपया KCC हेल्पलाइन 1800-180-1551 पर कॉल करें।"
    return best["answer"]
```

## `app/voice.py` — Twilio Voice Handler

```python
"""
Handles inbound farmer calls via Twilio.
Flow: Answer → Detect language → Record query → Transcribe → RAG → Respond in farmer's language
"""
from twilio.twiml.voice_response import VoiceResponse, Gather, Record
from fastapi import Request
import httpx

WELCOME_MESSAGES = {
    "hi": "नमस्ते! किसान हेल्पलाइन में आपका स्वागत है। कृपया अपनी फसल की समस्या बताएं।",
    "en": "Welcome to Kisan Helpline. Please describe your crop problem after the beep.",
    "te": "నమస్కారం! రైతు సహాయ కేంద్రానికి స్వాగతం. దయచేసి మీ సమస్య చెప్పండి.",
    "ta": "வணக்கம்! விவசாயி உதவி மையத்தில் உங்களை வரவேற்கிறோம்.",
    "mr": "नमस्कार! शेतकरी मदत केंद्रात आपले स्वागत आहे.",
}


def create_welcome_twiml(language: str = "hi") -> str:
    """Create Twilio TwiML for welcome message + voice recording."""
    response = VoiceResponse()
    gather = Gather(
        input="speech",
        action="/voice/process",
        method="POST",
        language=f"{language}-IN",
        speech_timeout="auto",
        enhanced=True,
    )
    gather.say(
        WELCOME_MESSAGES.get(language, WELCOME_MESSAGES["hi"]),
        language=f"{language}-IN",
        voice="Polly.Aditi" if language == "hi" else "Polly.Raveena",
    )
    response.append(gather)
    # Fallback if no speech detected
    response.say(
        "हम आपकी आवाज़ नहीं सुन सके। कृपया पुनः प्रयास करें।",
        language="hi-IN",
    )
    return str(response)


def create_answer_twiml(answer_text: str, language: str = "hi") -> str:
    """Respond to farmer with the RAG answer."""
    response = VoiceResponse()
    response.say(answer_text, language=f"{language}-IN", voice="Polly.Aditi")
    # Offer to ask another question
    gather = Gather(
        input="speech",
        action="/voice/process",
        method="POST",
        language=f"{language}-IN",
        speech_timeout="auto",
    )
    gather.say("क्या आपका कोई और प्रश्न है?", language="hi-IN")
    response.append(gather)
    response.hangup()
    return str(response)
```

## `app/main.py` — FastAPI Application

```python
"""
Kisan Voice AI — Main FastAPI Application
Deploy on Railway.app (free tier) or Render.com (free tier)
"""
import os
from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, Response
from dotenv import load_dotenv

from app.bhashini import transcribe_and_translate, text_to_speech, LANGUAGE_CODES
from app.rag import get_best_answer
from app.voice import create_welcome_twiml, create_answer_twiml

load_dotenv()

app = FastAPI(
    title="Kisan Voice AI",
    description="AI farmer helpline in 22 Indian languages using AIKosh KCC dataset",
    version="1.0.0",
)


@app.get("/")
async def root():
    return {
        "status": "Kisan Voice AI is running",
        "languages_supported": list(LANGUAGE_CODES.keys()),
        "dataset": "AIKosh KCC Transcripts (2.4M+ queries)",
    }


@app.post("/voice/inbound")
async def handle_inbound_call(request: Request):
    """Twilio webhook for incoming farmer calls."""
    # Default to Hindi; real implementation detects from caller's region
    twiml = create_welcome_twiml(language="hi")
    return Response(content=twiml, media_type="application/xml")


@app.post("/voice/process")
async def process_speech(
    request: Request,
    SpeechResult: str = Form(default=""),
    From: str = Form(default=""),
    CallSid: str = Form(default=""),
):
    """Process farmer's speech and return answer."""
    if not SpeechResult:
        twiml = create_welcome_twiml()
        return Response(content=twiml, media_type="application/xml")

    # For MVP: Speech is already transcribed by Twilio in Hindi
    # Production: use Bhashini ASR for regional languages
    farmer_query = SpeechResult
    print(f"[{CallSid}] Farmer query: {farmer_query}")

    # Get best answer from KCC dataset
    answer = get_best_answer(farmer_query)
    print(f"[{CallSid}] Answer: {answer[:100]}...")

    twiml = create_answer_twiml(answer, language="hi")
    return Response(content=twiml, media_type="application/xml")


@app.post("/api/query")
async def query_api(payload: dict):
    """
    REST API for integration with web apps or WhatsApp.
    Body: {"query": "मेरी फसल पर कीड़े लग गए हैं", "language": "hi", "crop": "wheat"}
    """
    query = payload.get("query", "")
    language = payload.get("language", "hi")
    crop = payload.get("crop", None)

    if not query:
        return {"error": "query is required"}

    answer = get_best_answer(query, crop=crop)
    return {
        "query": query,
        "answer": answer,
        "language": language,
        "source": "AIKosh KCC Dataset",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
```

## `Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Setup & Run

```bash
# 1. Clone and install
git clone <your-repo>
cd kisan-voice-ai
pip install -r requirements.txt

# 2. Download KCC dataset from AIKosh
# Go to: https://aikosh.indiaai.gov.in/home/datasets/all
# Search "Kisan Call Centre"
# Download CSVs to ./data/kcc_raw/

# 3. Ingest dataset into ChromaDB
python data/ingest_kcc.py

# 4. Set environment variables
cp .env.example .env
# Fill in Bhashini API keys (free at https://bhashini.gov.in/)
# Fill in Twilio credentials (free trial at twilio.com)

# 5. Run
uvicorn app.main:app --reload

# 6. Test
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "गेहूं में पीला रतुआ रोग क्या है", "language": "hi", "crop": "wheat"}'

# 7. Deploy free on Railway.app
# railway login && railway init && railway up
```

---

# 2. PinAI

> Hyperlocal business intelligence by pincode using AIKosh census + pincode datasets.
> **Earn:** ₹299/month SaaS for SMBs. Resell to NBFCs for credit scoring.

## Architecture

```
User Inputs Pincode
        ↓
Next.js Frontend (Vercel — free)
        ↓
FastAPI Backend (Render.com — free)
        ↓
┌─────────────────────────────────────────────┐
│  AIKosh Data Layer (all free)               │
│  • All India Pincode Directory              │
│  • 2011 Census District Polygons            │
│  • Aadhaar Monthly Update Data              │
│  • Soil Moisture Data (for agri use cases)  │
└─────────────────────────────────────────────┘
        ↓
GeoPandas + SQLite Analysis Engine
        ↓
NL Insights via Claude API (Anthropic free tier)
```

## File Structure

```
pinai/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── data_loader.py    # Load AIKosh datasets
│   ├── analyzer.py       # Pincode analysis engine
│   ├── insights.py       # NL insight generation
│   └── models.py         # Pydantic schemas
├── frontend/
│   ├── pages/
│   │   └── index.jsx     # Main page
│   └── components/
│       ├── PincodeSearch.jsx
│       └── InsightCard.jsx
├── data/
│   └── setup_db.py       # Initialize SQLite from AIKosh CSVs
└── requirements.txt
```

## `requirements.txt`

```
fastapi==0.111.0
uvicorn==0.30.0
geopandas==0.14.4
pandas==2.2.2
shapely==2.0.4
sqlite-utils==3.36
httpx==0.27.0
python-dotenv==1.0.1
anthropic==0.28.0
```

## `backend/data_loader.py` — AIKosh Dataset Loader

```python
"""
Loads all relevant AIKosh free datasets into a local SQLite database.

Datasets to download from https://aikosh.indiaai.gov.in:
1. "All India Pincode Directory" → ./data/pincode_directory.csv
2. "2011 population census district polygon geometries" → ./data/district_polygons.geojson
3. "Aadhaar Biometric Monthly Update Data" → ./data/aadhaar_monthly.csv

All datasets are free to download after registration on AIKosh.
"""
import sqlite3
import pandas as pd
import geopandas as gpd
import os

DB_PATH = "./data/pinai.db"
DATA_DIR = "./data"


def init_database():
    """Initialize SQLite database with AIKosh data."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Load pincode directory
    pincode_file = f"{DATA_DIR}/pincode_directory.csv"
    if os.path.exists(pincode_file):
        df_pin = pd.read_csv(pincode_file)
        # Normalize column names (AIKosh files have varied naming)
        df_pin.columns = [c.lower().strip().replace(" ", "_") for c in df_pin.columns]
        df_pin.to_sql("pincodes", conn, if_exists="replace", index=False)
        print(f"Loaded {len(df_pin)} pincodes into DB")
    else:
        print(f"Warning: {pincode_file} not found. Download from AIKosh.")
        # Create a sample table for development
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pincodes (
                pincode TEXT PRIMARY KEY,
                office_name TEXT,
                pincode_type TEXT,
                delivery_status TEXT,
                district TEXT,
                division_name TEXT,
                region TEXT,
                circle_name TEXT,
                state_name TEXT,
                latitude REAL,
                longitude REAL
            )
        """)

    # Load Aadhaar monthly data (population proxy)
    aadhaar_file = f"{DATA_DIR}/aadhaar_monthly.csv"
    if os.path.exists(aadhaar_file):
        df_aadh = pd.read_csv(aadhaar_file)
        df_aadh.columns = [c.lower().strip().replace(" ", "_") for c in df_aadh.columns]
        df_aadh.to_sql("aadhaar_data", conn, if_exists="replace", index=False)
        print(f"Loaded {len(df_aadh)} Aadhaar records into DB")

    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


def get_pincode_data(pincode: str) -> dict:
    """Fetch all data for a given pincode."""
    conn = sqlite3.connect(DB_PATH)

    # Basic pincode info
    pin_df = pd.read_sql(
        "SELECT * FROM pincodes WHERE pincode = ?", conn, params=[pincode]
    )
    if pin_df.empty:
        conn.close()
        return {"error": f"Pincode {pincode} not found in AIKosh database"}

    pin_data = pin_df.iloc[0].to_dict()

    # Get district-level Aadhaar data if available
    district = pin_data.get("district", "")
    aadhaar_data = {}
    try:
        aadh_df = pd.read_sql(
            "SELECT * FROM aadhaar_data WHERE district LIKE ? LIMIT 10",
            conn,
            params=[f"%{district}%"],
        )
        if not aadh_df.empty:
            aadhaar_data = {
                "total_enrollments": int(aadh_df.get("total_enrolments", pd.Series([0])).sum()),
                "recent_updates": len(aadh_df),
            }
    except Exception:
        pass

    conn.close()
    return {**pin_data, "aadhaar": aadhaar_data}


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    init_database()
```

## `backend/analyzer.py` — Pincode Analysis Engine

```python
"""
Core analysis engine for PinAI.
Generates business intelligence metrics for any pincode.
"""
import sqlite3
import pandas as pd
from typing import Optional

DB_PATH = "./data/pinai.db"


class PincodeAnalyzer:
    def __init__(self):
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)

    def get_nearby_pincodes(self, pincode: str, radius_km: float = 10) -> list[str]:
        """Find pincodes within radius_km of the given pincode."""
        pin_df = pd.read_sql(
            "SELECT latitude, longitude FROM pincodes WHERE pincode = ?",
            self.conn,
            params=[pincode],
        )
        if pin_df.empty or pd.isna(pin_df.iloc[0]["latitude"]):
            return []

        lat, lon = pin_df.iloc[0]["latitude"], pin_df.iloc[0]["longitude"]
        # Approximate degree offset for radius
        lat_delta = radius_km / 111.0
        lon_delta = radius_km / (111.0 * abs(lat / 90 + 0.01))

        nearby = pd.read_sql(
            """
            SELECT pincode FROM pincodes
            WHERE latitude BETWEEN ? AND ?
            AND longitude BETWEEN ? AND ?
            AND pincode != ?
            LIMIT 20
            """,
            self.conn,
            params=[lat - lat_delta, lat + lat_delta,
                    lon - lon_delta, lon + lon_delta, pincode],
        )
        return nearby["pincode"].tolist()

    def get_business_metrics(self, pincode: str) -> dict:
        """
        Calculate business metrics for a pincode.
        In production, augment with GST registration data from Open Government Data.
        """
        pin_data = pd.read_sql(
            "SELECT * FROM pincodes WHERE pincode = ?",
            self.conn,
            params=[pincode],
        )
        if pin_data.empty:
            return {}

        row = pin_data.iloc[0]
        nearby = self.get_nearby_pincodes(pincode)

        # Delivery status as business viability proxy
        delivery_active = row.get("delivery_status", "").lower() == "delivery"

        # Count nearby post offices (density = commercial activity proxy)
        nearby_count = len(nearby)
        density_score = min(10, nearby_count)

        return {
            "pincode": pincode,
            "location": {
                "office": row.get("office_name", ""),
                "district": row.get("district", ""),
                "state": row.get("state_name", ""),
                "division": row.get("division_name", ""),
                "coordinates": {
                    "lat": float(row.get("latitude", 0) or 0),
                    "lon": float(row.get("longitude", 0) or 0),
                },
            },
            "business_signals": {
                "delivery_active": delivery_active,
                "nearby_pincodes_10km": len(nearby),
                "market_density_score": density_score,  # 1-10
                "estimated_catchment_area": f"{nearby_count * 5}-{nearby_count * 15} sq km",
            },
            "recommendation": self._get_recommendation(density_score, delivery_active),
        }

    def _get_recommendation(self, density: int, delivery: bool) -> str:
        if density >= 8 and delivery:
            return "HIGH POTENTIAL: Dense urban/semi-urban area with active delivery. Strong footfall expected."
        elif density >= 5 and delivery:
            return "MEDIUM POTENTIAL: Growing area with delivery infrastructure. Good for retail expansion."
        elif density >= 3:
            return "EMERGING: Low density but delivery present. First-mover advantage possible."
        else:
            return "RURAL: Very low density. Best for agri-services or rural financial products."

    def compare_pincodes(self, pincodes: list[str]) -> list[dict]:
        """Compare multiple pincodes for business expansion decisions."""
        return [self.get_business_metrics(p) for p in pincodes]
```

## `backend/insights.py` — NL Insight Generation

```python
"""
Generates natural language business insights using Claude API (Anthropic).
Free tier: 5M tokens/month on Claude Haiku — sufficient for MVP.
"""
import anthropic
import os
from backend.analyzer import PincodeAnalyzer

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
analyzer = PincodeAnalyzer()


def generate_business_insight(pincode: str, business_type: str = "retail") -> str:
    """
    Generate actionable business insight for a pincode.
    Uses Claude Haiku (cheapest, fastest) with AIKosh data as context.
    """
    metrics = analyzer.get_business_metrics(pincode)
    if "error" in metrics:
        return f"Could not find data for pincode {pincode}."

    prompt = f"""You are a business intelligence consultant for Indian SMBs.

A {business_type} business owner is evaluating this location:
- Pincode: {pincode}
- Location: {metrics['location']['office']}, {metrics['location']['district']}, {metrics['location']['state']}
- Market density score: {metrics['business_signals']['market_density_score']}/10
- Delivery infrastructure: {'Active' if metrics['business_signals']['delivery_active'] else 'Inactive'}
- Nearby pincodes (10km radius): {metrics['business_signals']['nearby_pincodes_10km']}
- Catchment area: {metrics['business_signals']['estimated_catchment_area']}

Provide a 3-sentence business insight covering:
1. Market potential for a {business_type} business
2. Competitive landscape expectation
3. One specific recommendation

Keep it practical, in simple English that a small business owner can understand.
Data source: Government of India AIKosh dataset."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def generate_expansion_report(current_pincode: str, candidate_pincodes: list[str]) -> str:
    """
    Generate expansion analysis comparing multiple pincodes.
    Useful for B2B: NBFCs, insurance companies, retail chains.
    """
    comparisons = analyzer.compare_pincodes([current_pincode] + candidate_pincodes)

    context = "\n".join(
        [
            f"- {c['pincode']} ({c['location']['district']}): "
            f"Density {c['business_signals']['market_density_score']}/10, "
            f"{c['business_signals']['nearby_pincodes_10km']} nearby locations"
            for c in comparisons
        ]
    )

    prompt = f"""You are analyzing business expansion options for an Indian MSME.

Current location: {current_pincode}
Expansion candidates (from AIKosh Pincode + Census data):
{context}

Rank the expansion candidates and give a 2-sentence rationale for your top pick.
Be direct and specific."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
```

## `backend/main.py` — FastAPI Application

```python
"""
PinAI Backend — FastAPI application
Free deployment on Render.com or Railway.app
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
import os

from backend.analyzer import PincodeAnalyzer
from backend.insights import generate_business_insight, generate_expansion_report

load_dotenv()

app = FastAPI(title="PinAI", description="Hyperlocal business intelligence by pincode")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = PincodeAnalyzer()


class PincodeRequest(BaseModel):
    pincode: str
    business_type: Optional[str] = "retail"


class ExpansionRequest(BaseModel):
    current_pincode: str
    candidate_pincodes: List[str]


@app.get("/")
async def root():
    return {"status": "PinAI running", "data_source": "AIKosh Government Datasets"}


@app.get("/pincode/{pincode}")
async def get_pincode_metrics(pincode: str):
    """Get business metrics for a pincode."""
    if len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Pincode must be 6 digits")
    metrics = analyzer.get_business_metrics(pincode)
    if "error" in metrics:
        raise HTTPException(status_code=404, detail=metrics["error"])
    return metrics


@app.post("/insight")
async def get_insight(req: PincodeRequest):
    """Get AI-generated business insight for a pincode."""
    insight = generate_business_insight(req.pincode, req.business_type)
    metrics = analyzer.get_business_metrics(req.pincode)
    return {"pincode": req.pincode, "insight": insight, "metrics": metrics}


@app.post("/expansion")
async def get_expansion_analysis(req: ExpansionRequest):
    """Compare pincodes for business expansion."""
    if len(req.candidate_pincodes) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 candidates at a time")
    report = generate_expansion_report(req.current_pincode, req.candidate_pincodes)
    comparisons = analyzer.compare_pincodes(
        [req.current_pincode] + req.candidate_pincodes
    )
    return {"report": report, "comparisons": comparisons}


@app.get("/health")
async def health():
    return {"status": "ok"}
```

## `frontend/pages/index.jsx` — Next.js Frontend

```jsx
// PinAI Frontend — Deploy free on Vercel
// npm create next-app pinai-frontend && cd pinai-frontend
// Replace pages/index.js with this file

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PinAI() {
  const [pincode, setPincode] = useState("");
  const [businessType, setBusinessType] = useState("retail");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (pincode.length !== 6) {
      setError("Please enter a valid 6-digit pincode");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode, business_type: businessType }),
      });
      if (!res.ok) throw new Error("Pincode not found in database");
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>PinAI</h1>
      <p style={{ color: "#666" }}>Business intelligence for any Indian pincode</p>
      <p style={{ fontSize: 12, color: "#999" }}>
        Data source: Government of India via AIKosh (aikosh.indiaai.gov.in)
      </p>

      <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter 6-digit pincode (e.g. 834001)"
          style={{ flex: 1, padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8, fontSize: 16 }}
        />
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8 }}
        >
          <option value="retail">Retail Shop</option>
          <option value="restaurant">Restaurant</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="education">Education/Coaching</option>
          <option value="clinic">Medical Clinic</option>
          <option value="logistics">Logistics/Delivery</option>
        </select>
        <button
          onClick={analyze}
          disabled={loading || pincode.length !== 6}
          style={{
            padding: "10px 20px", background: "#16a34a", color: "#fff",
            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15,
            opacity: loading || pincode.length !== 6 ? 0.6 : 1,
          }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: 12, color: "#dc2626" }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {result.metrics?.location?.office}, {result.metrics?.location?.district}
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "#166534" }}>{result.insight}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Market Density", value: `${result.metrics?.business_signals?.market_density_score}/10` },
              { label: "Nearby Pincodes", value: result.metrics?.business_signals?.nearby_pincodes_10km },
              { label: "Delivery", value: result.metrics?.business_signals?.delivery_active ? "Active" : "Limited" },
            ].map((m) => (
              <div key={m.label} style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 500, marginTop: 4 }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, padding: 12, background: "#fffbeb", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
            {result.metrics?.business_signals?.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Setup & Run

```bash
# Backend
cd backend
pip install -r requirements.txt

# Download AIKosh datasets (free after registration)
# 1. https://aikosh.indiaai.gov.in → Datasets → "All India Pincode Directory"
# 2. Save as ./data/pincode_directory.csv
# 3. Optionally download Aadhaar data and census data

python data_loader.py  # Initialize database

cp .env.example .env   # Add ANTHROPIC_API_KEY
uvicorn backend.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev

# Deploy: push to GitHub → Vercel auto-deploys frontend
# Backend: railway.app or render.com (both free tier)
```

---

# 3. DocPatram

> AI for Indian government documents using BharatGen Patram 7B from AIKosh.
> **Earn:** B2G SaaS contracts. Target CDSCO (₹85L prize pool) and NSAP pension dept.

## Architecture

```
Document Upload (PDF/Image/Scan)
         ↓
FastAPI Backend (Render.com free)
         ↓
┌─────────────────────────────────────────────┐
│  AIKosh Free Models                         │
│  • Patram 7B — Vision-Language Model        │
│    India's first model for Indian docs      │
│  • OCR Toolkit — Extract printed text       │
│  • ARX — Anonymize PII before processing    │
└─────────────────────────────────────────────┘
         ↓
Structured JSON Output + Search Index
         ↓
React Dashboard (Vercel free)
```

## File Structure

```
docpatram/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── ocr.py            # AIKosh OCR toolkit wrapper
│   ├── patram.py         # BharatGen Patram 7B wrapper
│   ├── anonymizer.py     # AIKosh ARX PII removal
│   ├── extractor.py      # Structured field extraction
│   └── search.py         # SQLite FTS5 search
├── frontend/
│   └── pages/
│       └── index.jsx     # Document upload + results UI
├── requirements.txt
└── README.md
```

## `requirements.txt`

```
fastapi==0.111.0
uvicorn==0.30.0
python-multipart==0.0.9
Pillow==10.3.0
pdf2image==1.17.0
httpx==0.27.0
transformers==4.42.0
torch==2.3.0
huggingface-hub==0.23.4
sqlite-utils==3.36
python-dotenv==1.0.1
presidio-analyzer==2.2.354
presidio-anonymizer==2.2.354
```

## `backend/patram.py` — BharatGen Patram 7B Wrapper

```python
"""
BharatGen Patram 7B — India's first Vision-Language Model for Documents.
Free on AIKosh and HuggingFace: bharatgen/Patram-7B-Instruct

This model can:
- Read handwritten and printed Indian government documents
- Extract structured fields from forms (Aadhaar, PAN, ration card, etc.)
- Understand mixed Hindi+English text
- Process scanned PDFs and photos of documents

Model page: https://aikosh.indiaai.gov.in/home/models/all
HuggingFace: bharatgen/Patram-7B-Instruct
"""
from transformers import AutoTokenizer, AutoModelForVision2Seq, AutoProcessor
from PIL import Image
import torch
import io
import base64
from functools import lru_cache

MODEL_ID = "bharatgen/Patram-7B-Instruct"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


@lru_cache(maxsize=1)
def load_model():
    """Load Patram 7B model. Cached after first load (~14GB VRAM or 28GB RAM for CPU)."""
    print(f"Loading Patram 7B on {DEVICE}... This takes 1-2 minutes on first run.")
    processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
    model = AutoModelForVision2Seq.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
        device_map="auto",
        trust_remote_code=True,
    )
    return processor, model


def extract_from_document(image: Image.Image, document_type: str = "general") -> dict:
    """
    Extract structured information from an Indian government document image.

    document_type options: "aadhaar", "pan", "ration_card", "land_record",
                           "hospital_form", "pension_form", "general"
    Returns: dict with extracted fields
    """
    processor, model = load_model()

    # Build extraction prompt based on document type
    prompts = {
        "aadhaar": "Extract from this Aadhaar card: name, date of birth, gender, address, Aadhaar number (last 4 digits only). Return as JSON.",
        "pan": "Extract from this PAN card: name, father's name, date of birth, PAN number. Return as JSON.",
        "ration_card": "Extract from this ration card: head of family name, address, district, state, card number, category, family members count. Return as JSON.",
        "land_record": "Extract from this land record document: survey number, area, owner name, location, district, state, village. Return as JSON.",
        "hospital_form": "Extract from this hospital form: patient name, age, gender, diagnosis, doctor name, date, hospital name. Return as JSON.",
        "pension_form": "Extract from this pension form: beneficiary name, age, scheme name, bank details, district, state, beneficiary ID. Return as JSON.",
        "general": "Extract all text and key information from this document. Identify the document type and extract key fields. Return as JSON with fields: document_type, extracted_text, key_fields.",
    }

    prompt = prompts.get(document_type, prompts["general"])

    # Process with Patram 7B
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt},
            ],
        }
    ]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=[text], images=[image], return_tensors="pt").to(DEVICE)

    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=512,
            do_sample=False,
            temperature=1.0,
        )

    output = processor.batch_decode(
        generated_ids[:, inputs["input_ids"].shape[1]:],
        skip_special_tokens=True,
    )[0]

    # Parse JSON from output
    import json
    import re
    json_match = re.search(r"\{.*\}", output, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return {"raw_output": output, "document_type": document_type}


def batch_extract(images: list[Image.Image], document_type: str = "general") -> list[dict]:
    """Extract from multiple documents."""
    return [extract_from_document(img, document_type) for img in images]
```

## `backend/ocr.py` — OCR Pipeline

```python
"""
OCR pipeline using AIKosh OCR Toolkit + Tesseract for Indian language text.
AIKosh OCR Toolkit: https://aikosh.indiaai.gov.in/home/toolkit
Install: pip install pytesseract Pillow pdf2image
Also install Tesseract: sudo apt-get install tesseract-ocr tesseract-ocr-hin tesseract-ocr-ben
"""
import io
import base64
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes
from typing import Union

# Supported Indian language codes for Tesseract
LANG_MAP = {
    "hindi": "hin",
    "english": "eng",
    "bengali": "ben",
    "telugu": "tel",
    "marathi": "mar",
    "tamil": "tam",
    "gujarati": "guj",
    "kannada": "kan",
    "punjabi": "pan",
    "odia": "ori",
    "mixed": "hin+eng",  # Most government documents
}


def extract_text_from_image(
    image: Image.Image,
    language: str = "mixed",
) -> str:
    """Extract text from a document image using Tesseract OCR."""
    lang_code = LANG_MAP.get(language, "hin+eng")
    # Preprocess for better OCR accuracy
    import cv2
    import numpy as np

    img_array = np.array(image)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    # Adaptive threshold for scanned documents
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    processed = Image.fromarray(thresh)

    config = "--oem 3 --psm 6"  # LSTM engine, uniform text block
    text = pytesseract.image_to_string(processed, lang=lang_code, config=config)
    return text.strip()


def extract_from_pdf(pdf_bytes: bytes, language: str = "mixed") -> list[str]:
    """Extract text from each page of a PDF."""
    images = convert_from_bytes(pdf_bytes, dpi=300)
    return [extract_text_from_image(img, language) for img in images]


def extract_from_upload(file_bytes: bytes, filename: str, language: str = "mixed") -> dict:
    """
    Universal document extraction.
    Handles: PDF, JPG, PNG, TIFF (common scan formats)
    """
    ext = filename.lower().split(".")[-1]

    if ext == "pdf":
        pages = extract_from_pdf(file_bytes, language)
        return {
            "type": "pdf",
            "pages": len(pages),
            "text": "\n\n--- Page Break ---\n\n".join(pages),
            "page_texts": pages,
        }
    elif ext in ["jpg", "jpeg", "png", "tiff", "tif", "bmp"]:
        image = Image.open(io.BytesIO(file_bytes))
        text = extract_text_from_image(image, language)
        return {"type": "image", "pages": 1, "text": text, "page_texts": [text]}
    else:
        return {"error": f"Unsupported file type: {ext}"}
```

## `backend/anonymizer.py` — PII Removal using AIKosh ARX

```python
"""
PII anonymization before processing government documents.
Uses Microsoft Presidio (available via AIKosh ARX toolkit).
Install: pip install presidio-analyzer presidio-anonymizer
Download spaCy model: python -m spacy download en_core_web_lg
"""
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from functools import lru_cache

# PII entities to detect and mask in Indian documents
INDIAN_PII_ENTITIES = [
    "PERSON",           # Names
    "PHONE_NUMBER",     # Phone numbers
    "EMAIL_ADDRESS",    # Email
    "LOCATION",         # Addresses
    "IN_PAN",          # PAN card numbers
    "IN_AADHAAR",      # Aadhaar numbers (custom recognizer needed)
    "DATE_TIME",        # Dates of birth
    "BANK_ACCOUNT",    # Bank account numbers
    "CREDIT_CARD",     # Credit card numbers
]


@lru_cache(maxsize=1)
def get_engines():
    """Initialize Presidio engines (cached)."""
    analyzer = AnalyzerEngine()
    anonymizer = AnonymizerEngine()
    return analyzer, anonymizer


def anonymize_text(text: str, language: str = "en") -> dict:
    """
    Remove PII from document text before AI processing.
    Returns: {"anonymized_text": str, "pii_found": list}
    """
    analyzer, anonymizer = get_engines()

    # Analyze for PII
    results = analyzer.analyze(
        text=text,
        entities=INDIAN_PII_ENTITIES,
        language=language,
    )

    # Anonymize
    anonymized = anonymizer.anonymize(text=text, analyzer_results=results)

    pii_found = [
        {"entity_type": r.entity_type, "score": round(r.score, 2)}
        for r in results
    ]

    return {
        "anonymized_text": anonymized.text,
        "pii_found": pii_found,
        "pii_count": len(pii_found),
    }


def safe_extract(text: str) -> str:
    """Anonymize text and return safe version for AI processing."""
    result = anonymize_text(text)
    return result["anonymized_text"]
```

## `backend/main.py` — FastAPI Application

```python
"""
DocPatram Backend — FastAPI application for Indian government document AI
"""
import io
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from typing import Optional
from dotenv import load_dotenv

from backend.ocr import extract_from_upload
from backend.patram import extract_from_document
from backend.anonymizer import anonymize_text

load_dotenv()

app = FastAPI(
    title="DocPatram",
    description="AI extraction for Indian government documents using Patram 7B",
)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

DOCUMENT_TYPES = [
    "general", "aadhaar", "pan", "ration_card",
    "land_record", "hospital_form", "pension_form",
]


@app.get("/")
async def root():
    return {
        "status": "DocPatram running",
        "model": "BharatGen Patram 7B (AIKosh)",
        "supported_docs": DOCUMENT_TYPES,
    }


@app.post("/extract")
async def extract_document(
    file: UploadFile = File(...),
    document_type: str = Form(default="general"),
    language: str = Form(default="mixed"),
    anonymize: bool = Form(default=True),
):
    """
    Extract structured data from an Indian government document.
    Supports: PDF, JPG, PNG, TIFF
    """
    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"document_type must be one of: {DOCUMENT_TYPES}",
        )

    file_bytes = await file.read()
    filename = file.filename or "document.jpg"

    # Step 1: OCR extraction
    ocr_result = extract_from_upload(file_bytes, filename, language)
    if "error" in ocr_result:
        raise HTTPException(status_code=400, detail=ocr_result["error"])

    raw_text = ocr_result["text"]

    # Step 2: Anonymize PII if requested (default: yes for privacy)
    anon_result = {}
    processing_text = raw_text
    if anonymize:
        anon_result = anonymize_text(raw_text)
        processing_text = anon_result["anonymized_text"]

    # Step 3: Patram 7B structured extraction (on original image)
    patram_result = {}
    if filename.lower().split(".")[-1] in ["jpg", "jpeg", "png", "tiff", "tif"]:
        image = Image.open(io.BytesIO(file_bytes))
        patram_result = extract_from_document(image, document_type)

    return {
        "filename": filename,
        "document_type": document_type,
        "pages": ocr_result.get("pages", 1),
        "ocr_text": raw_text[:500] + "..." if len(raw_text) > 500 else raw_text,
        "structured_extraction": patram_result,
        "anonymization": {
            "applied": anonymize,
            "pii_entities_found": anon_result.get("pii_count", 0),
            "entities": anon_result.get("pii_found", []),
        },
        "model_used": "BharatGen Patram 7B (AIKosh)",
    }


@app.post("/batch-extract")
async def batch_extract(
    files: list[UploadFile] = File(...),
    document_type: str = Form(default="general"),
):
    """Batch extract from multiple documents."""
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 files per batch")
    results = []
    for file in files:
        file_bytes = await file.read()
        ocr = extract_from_upload(file_bytes, file.filename or "doc.jpg")
        results.append({"filename": file.filename, "text_length": len(ocr.get("text", ""))})
    return {"batch_size": len(files), "results": results}


@app.get("/health")
async def health():
    return {"status": "ok"}
```

## `frontend/pages/index.jsx` — Document Upload UI

```jsx
// DocPatram Frontend
import { useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DOC_TYPES = [
  { value: "general", label: "Auto-detect" },
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "ration_card", label: "Ration Card" },
  { value: "land_record", label: "Land Record" },
  { value: "hospital_form", label: "Hospital Form" },
  { value: "pension_form", label: "Pension Form" },
];

export default function DocPatram() {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("general");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const onFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    if (f && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const extract = async () => {
    if (!file) { setError("Please select a document"); return; }
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", docType);
    formData.append("anonymize", "true");
    try {
      const res = await fetch(`${API_BASE}/extract`, { method: "POST", body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>DocPatram</h1>
      <p style={{ color: "#666" }}>AI extraction for Indian government documents</p>
      <p style={{ fontSize: 12, color: "#999" }}>Model: BharatGen Patram 7B via AIKosh</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 }}
        >
          {DOC_TYPES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff" onChange={onFileChange}
          style={{ flex: 1 }} />
        <button onClick={extract} disabled={loading || !file}
          style={{ padding: "8px 20px", background: "#7c3aed", color: "#fff",
            border: "none", borderRadius: 8, cursor: "pointer",
            opacity: loading || !file ? 0.6 : 1 }}>
          {loading ? "Extracting..." : "Extract"}
        </button>
      </div>

      {preview && (
        <img src={preview} alt="Document preview"
          style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8,
            border: "1px solid #e5e7eb", marginBottom: 16 }} />
      )}

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, padding: 12, color: "#dc2626", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ background: "#faf5ff", border: "1px solid #c4b5fd",
            borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
              Extracted: {result.document_type} ({result.pages} page{result.pages > 1 ? "s" : ""})
            </h3>
            <pre style={{ fontSize: 13, overflow: "auto", maxHeight: 200,
              background: "#f5f3ff", padding: 10, borderRadius: 6 }}>
              {JSON.stringify(result.structured_extraction, null, 2)}
            </pre>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>PII Entities Found</div>
              <div style={{ fontSize: 22, fontWeight: 500 }}>
                {result.anonymization.pii_entities_found}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>automatically masked</div>
            </div>
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Model Used</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>Patram 7B</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>BharatGen / AIKosh</div>
            </div>
          </div>
          <div style={{ marginTop: 12, background: "#f9fafb", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>OCR Text Preview</div>
            <p style={{ fontSize: 13, margin: 0 }}>{result.ocr_text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Setup & Run

```bash
# Install system dependencies
sudo apt-get install tesseract-ocr tesseract-ocr-hin tesseract-ocr-ben
pip install -r requirements.txt
python -m spacy download en_core_web_lg

# Note: Patram 7B will auto-download from HuggingFace on first run (~14GB)
# For CPU-only server: model runs slow; use AIKosh GPU notebook (free A100)

uvicorn backend.main:app --reload
```

---

# 4. VaadVivaad

> AI dispute resolution for MSME sellers targeting the IndiaAI ₹5.25 Cr MSME-ODR competition.
> **Earn:** Win competition first, then ₹499 per dispute for MSMEs.

## Architecture

```
MSME Seller Files Dispute (Web/WhatsApp)
              ↓
Next.js Frontend (Vercel free)
              ↓
FastAPI Backend (Railway.app free)
              ↓
┌─────────────────────────────────────────────┐
│  AIKosh Free Models                         │
│  • Sarvam-105B — Multilingual reasoning     │
│  • Bhashini — Regional language support     │
│  • Shoonya — Text annotation toolkit        │
└─────────────────────────────────────────────┘
              ↓
SQLite dispute database + PDF report generation
```

## File Structure

```
vaadvivaad/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── sarvam.py         # Sarvam-105B API wrapper
│   ├── dispute.py        # Dispute logic engine
│   ├── resolution.py     # AI mediation engine
│   ├── report.py         # Resolution report PDF
│   └── db.py             # SQLite dispute storage
├── frontend/
│   └── pages/
│       ├── index.jsx     # Dispute filing
│       └── status.jsx    # Track dispute
└── requirements.txt
```

## `requirements.txt`

```
fastapi==0.111.0
uvicorn==0.30.0
httpx==0.27.0
sqlite-utils==3.36
reportlab==4.2.0
python-dotenv==1.0.1
anthropic==0.28.0
pydantic==2.7.0
python-multipart==0.0.9
```

## `backend/sarvam.py` — Sarvam-105B API Wrapper

```python
"""
Sarvam-105B — India's best multilingual reasoning model.
Available free on AIKosh and HuggingFace.
Model: sarvam-ai/sarvam-105b (MoE, 10.3B active params)
Best for: complex reasoning, multilingual understanding, agentic tasks

For API access: https://www.sarvam.ai/ (free tier available)
For self-hosting: HuggingFace + AIKosh GPU notebook (free A100)

This wrapper uses Sarvam's API endpoint.
"""
import httpx
import os
from typing import Optional

SARVAM_API_BASE = "https://api.sarvam.ai"


async def analyze_dispute(
    complainant_statement: str,
    respondent_statement: str,
    dispute_type: str,
    amount: float,
    language: str = "hi",
) -> dict:
    """
    Use Sarvam-105B to analyze a dispute and suggest resolution.
    Returns: {analysis, recommendation, suggested_resolution, confidence}
    """
    system_prompt = """You are an AI mediator for MSME business disputes in India.
You understand Indian business law, MSME Act 2006, and common trade practices.
Analyze disputes fairly, considering both parties' perspectives.
Always suggest a specific monetary resolution when applicable.
Respond in the same language as the input."""

    user_prompt = f"""Dispute Analysis Request:
Type: {dispute_type}
Amount in dispute: ₹{amount:,.0f}
Language: {language}

Complainant (buyer/seller) statement:
{complainant_statement}

Respondent statement:
{respondent_statement}

Provide:
1. Brief analysis of the dispute (2-3 sentences)
2. Which party has stronger claim and why
3. Specific resolution recommendation with amount if applicable
4. Confidence level (High/Medium/Low)

Format as JSON: {{
  "analysis": "...",
  "stronger_claim": "complainant|respondent|unclear",
  "reasoning": "...",
  "resolution": {{
    "type": "full_refund|partial_refund|no_refund|delivery|apology|other",
    "amount": 0,
    "details": "..."
  }},
  "confidence": "High|Medium|Low"
}}"""

    # Use Sarvam API
    api_key = os.getenv("SARVAM_API_KEY")
    if api_key:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{SARVAM_API_BASE}/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "sarvam-m",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                },
            )
            result = response.json()
            import json
            return json.loads(result["choices"][0]["message"]["content"])
    else:
        # Fallback: use Anthropic Claude (also excellent for this)
        import anthropic
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        import json
        import re
        text = message.content[0].text
        json_match = re.search(r"\{.*\}", text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return {"error": "Could not parse AI response", "raw": text}
```

## `backend/dispute.py` — Dispute Logic

```python
"""
Dispute management: creation, tracking, status updates.
"""
import sqlite3
import uuid
import json
from datetime import datetime, timedelta
from typing import Optional

DB_PATH = "./data/disputes.db"


def init_db():
    """Initialize dispute database."""
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS disputes (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            dispute_type TEXT NOT NULL,
            amount REAL NOT NULL,
            language TEXT DEFAULT 'hi',
            complainant_name TEXT,
            complainant_phone TEXT,
            respondent_name TEXT,
            respondent_phone TEXT,
            complainant_statement TEXT NOT NULL,
            respondent_statement TEXT,
            ai_analysis TEXT,
            resolution TEXT,
            resolved_at TEXT,
            accepted_by TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_status ON disputes(status);
        CREATE INDEX IF NOT EXISTS idx_phone ON disputes(complainant_phone);
    """)
    conn.commit()
    conn.close()


def create_dispute(
    dispute_type: str,
    amount: float,
    complainant_name: str,
    complainant_phone: str,
    complainant_statement: str,
    respondent_name: str,
    respondent_phone: Optional[str] = None,
    language: str = "hi",
) -> str:
    """Create a new dispute and return its ID."""
    dispute_id = f"VV{str(uuid.uuid4())[:8].upper()}"
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """INSERT INTO disputes
           (id, created_at, dispute_type, amount, language,
            complainant_name, complainant_phone, respondent_name,
            respondent_phone, complainant_statement, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting_respondent')""",
        (
            dispute_id,
            datetime.now().isoformat(),
            dispute_type,
            amount,
            language,
            complainant_name,
            complainant_phone,
            respondent_name,
            respondent_phone,
            complainant_statement,
        ),
    )
    conn.commit()
    conn.close()
    return dispute_id


def get_dispute(dispute_id: str) -> Optional[dict]:
    """Get dispute by ID."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM disputes WHERE id = ?", [dispute_id]
    ).fetchone()
    conn.close()
    if row:
        d = dict(row)
        if d.get("ai_analysis"):
            try:
                d["ai_analysis"] = json.loads(d["ai_analysis"])
            except Exception:
                pass
        return d
    return None


def update_respondent_statement(dispute_id: str, statement: str) -> bool:
    """Add respondent's side of the story."""
    conn = sqlite3.connect(DB_PATH)
    updated = conn.execute(
        "UPDATE disputes SET respondent_statement = ?, status = 'in_analysis' WHERE id = ?",
        [statement, dispute_id],
    ).rowcount
    conn.commit()
    conn.close()
    return updated > 0


def save_ai_analysis(dispute_id: str, analysis: dict, resolution: str) -> bool:
    """Save AI analysis and resolution recommendation."""
    import json
    conn = sqlite3.connect(DB_PATH)
    updated = conn.execute(
        """UPDATE disputes SET ai_analysis = ?, resolution = ?,
           status = 'resolved', resolved_at = ?
           WHERE id = ?""",
        [json.dumps(analysis), resolution, datetime.now().isoformat(), dispute_id],
    ).rowcount
    conn.commit()
    conn.close()
    return updated > 0


def list_disputes(phone: str = None, status: str = None) -> list[dict]:
    """List disputes, optionally filtered by phone or status."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    query = "SELECT id, created_at, status, dispute_type, amount, complainant_name, respondent_name FROM disputes WHERE 1=1"
    params = []
    if phone:
        query += " AND (complainant_phone = ? OR respondent_phone = ?)"
        params.extend([phone, phone])
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT 50"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]
```

## `backend/resolution.py` — AI Mediation Engine

```python
"""
Core mediation engine: orchestrates dispute analysis and resolution.
"""
import asyncio
from backend.sarvam import analyze_dispute
from backend.dispute import get_dispute, save_ai_analysis


async def run_mediation(dispute_id: str) -> dict:
    """
    Run AI mediation on a dispute with both parties' statements.
    Returns the resolution.
    """
    dispute = get_dispute(dispute_id)
    if not dispute:
        return {"error": "Dispute not found"}

    if not dispute.get("respondent_statement"):
        return {"error": "Waiting for respondent statement"}

    analysis = await analyze_dispute(
        complainant_statement=dispute["complainant_statement"],
        respondent_statement=dispute["respondent_statement"],
        dispute_type=dispute["dispute_type"],
        amount=dispute["amount"],
        language=dispute.get("language", "hi"),
    )

    resolution_text = _format_resolution(analysis, dispute)
    save_ai_analysis(dispute_id, analysis, resolution_text)

    return {
        "dispute_id": dispute_id,
        "analysis": analysis,
        "resolution": resolution_text,
        "status": "resolved",
    }


def _format_resolution(analysis: dict, dispute: dict) -> str:
    """Format AI analysis into a human-readable resolution order."""
    res = analysis.get("resolution", {})
    res_type = res.get("type", "unclear")
    amount = res.get("amount", 0)
    details = res.get("details", "")

    lines = [
        f"VAADVIVAAD RESOLUTION ORDER",
        f"Dispute ID: {dispute['id']}",
        f"Date: {dispute.get('resolved_at', 'Today')}",
        f"",
        f"Parties:",
        f"  Complainant: {dispute['complainant_name']}",
        f"  Respondent: {dispute['respondent_name']}",
        f"",
        f"Dispute Type: {dispute['dispute_type']}",
        f"Amount in Dispute: ₹{dispute['amount']:,.0f}",
        f"",
        f"AI Analysis: {analysis.get('analysis', '')}",
        f"",
        f"Resolution: {res_type.replace('_', ' ').title()}",
    ]
    if amount > 0:
        lines.append(f"Resolution Amount: ₹{amount:,.0f}")
    if details:
        lines.append(f"Details: {details}")
    lines.append(f"")
    lines.append(f"Confidence: {analysis.get('confidence', 'Medium')}")
    lines.append(f"")
    lines.append(f"This is an AI-mediated recommendation. Both parties must agree.")
    lines.append(f"Powered by Sarvam-105B via AIKosh")

    return "\n".join(lines)
```

## `backend/main.py` — FastAPI Application

```python
"""
VaadVivaad Backend — AI Dispute Resolution for Indian MSMEs
"""
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

from backend.dispute import (
    init_db, create_dispute, get_dispute,
    update_respondent_statement, list_disputes
)
from backend.resolution import run_mediation

load_dotenv()
init_db()

app = FastAPI(title="VaadVivaad", description="AI dispute resolution for Indian MSMEs")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

DISPUTE_TYPES = [
    "payment_default",     # Buyer didn't pay
    "goods_not_delivered", # Goods not received
    "quality_issue",       # Product quality mismatch
    "contract_breach",     # Contract violated
    "service_dispute",     # Service not rendered
    "refund_denied",       # Refund not processed
    "invoice_dispute",     # Invoice amount disagreement
]


class DisputeCreate(BaseModel):
    dispute_type: str
    amount: float
    complainant_name: str
    complainant_phone: str
    complainant_statement: str
    respondent_name: str
    respondent_phone: Optional[str] = None
    language: str = "hi"


class RespondentResponse(BaseModel):
    dispute_id: str
    respondent_statement: str


@app.get("/")
async def root():
    return {
        "status": "VaadVivaad running",
        "model": "Sarvam-105B (AIKosh)",
        "dispute_types": DISPUTE_TYPES,
    }


@app.post("/dispute/file")
async def file_dispute(dispute: DisputeCreate, background_tasks: BackgroundTasks):
    """File a new dispute."""
    if dispute.dispute_type not in DISPUTE_TYPES:
        raise HTTPException(400, f"dispute_type must be one of: {DISPUTE_TYPES}")
    if dispute.amount <= 0:
        raise HTTPException(400, "amount must be positive")

    dispute_id = create_dispute(
        dispute_type=dispute.dispute_type,
        amount=dispute.amount,
        complainant_name=dispute.complainant_name,
        complainant_phone=dispute.complainant_phone,
        complainant_statement=dispute.complainant_statement,
        respondent_name=dispute.respondent_name,
        respondent_phone=dispute.respondent_phone,
        language=dispute.language,
    )

    return {
        "dispute_id": dispute_id,
        "status": "filed",
        "message": f"Dispute {dispute_id} filed. Share this ID with {dispute.respondent_name} to respond.",
        "next_step": f"POST /dispute/respond with dispute_id: {dispute_id}",
    }


@app.post("/dispute/respond")
async def respond_to_dispute(response: RespondentResponse, background_tasks: BackgroundTasks):
    """Respondent adds their side of the story. Triggers AI mediation."""
    dispute = get_dispute(response.dispute_id)
    if not dispute:
        raise HTTPException(404, "Dispute not found")
    if dispute["status"] not in ["waiting_respondent", "in_analysis"]:
        raise HTTPException(400, f"Cannot respond to dispute in status: {dispute['status']}")

    update_respondent_statement(response.dispute_id, response.respondent_statement)

    # Run AI mediation in background
    background_tasks.add_task(run_mediation, response.dispute_id)

    return {
        "dispute_id": response.dispute_id,
        "status": "in_analysis",
        "message": "Response received. AI mediation running. Check /dispute/{id} in 30 seconds.",
    }


@app.get("/dispute/{dispute_id}")
async def get_dispute_status(dispute_id: str):
    """Get current status and resolution of a dispute."""
    dispute = get_dispute(dispute_id)
    if not dispute:
        raise HTTPException(404, "Dispute not found")

    # Remove sensitive data from public response
    public = {k: v for k, v in dispute.items() if k not in ["complainant_phone", "respondent_phone"]}
    return public


@app.get("/disputes")
async def get_disputes(phone: Optional[str] = None, status: Optional[str] = None):
    """List disputes (filter by phone or status)."""
    return {"disputes": list_disputes(phone=phone, status=status)}


@app.post("/dispute/{dispute_id}/mediate")
async def force_mediation(dispute_id: str):
    """Manually trigger AI mediation (admin use)."""
    result = await run_mediation(dispute_id)
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.get("/health")
async def health():
    return {"status": "ok"}
```

## `frontend/pages/index.jsx` — Dispute Filing UI

```jsx
// VaadVivaad — File a Dispute
import { useState } from "react";
import { useRouter } from "next/router";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DISPUTE_TYPES = [
  { value: "payment_default", label: "Buyer didn't pay" },
  { value: "goods_not_delivered", label: "Goods not delivered" },
  { value: "quality_issue", label: "Product quality issue" },
  { value: "contract_breach", label: "Contract violated" },
  { value: "refund_denied", label: "Refund not given" },
  { value: "invoice_dispute", label: "Invoice dispute" },
];

export default function FilDispute() {
  const router = useRouter();
  const [form, setForm] = useState({
    dispute_type: "payment_default",
    amount: "",
    complainant_name: "",
    complainant_phone: "",
    complainant_statement: "",
    respondent_name: "",
    respondent_phone: "",
    language: "hi",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.complainant_name || !form.complainant_statement || !form.amount) {
      setError("Please fill all required fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/dispute/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const data = await res.json();
      setSuccess(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  if (success) {
    return (
      <div style={{ maxWidth: 540, margin: "60px auto", padding: "0 20px", fontFamily: "sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2>Dispute Filed</h2>
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 20, fontWeight: 600 }}>ID: {success.dispute_id}</p>
          <p style={{ color: "#166534" }}>{success.message}</p>
        </div>
        <button onClick={() => router.push(`/status?id=${success.dispute_id}`)}
          style={{ padding: "10px 24px", background: "#16a34a", color: "#fff",
            border: "none", borderRadius: 8, cursor: "pointer" }}>
          Track Dispute
        </button>
      </div>
    );
  }

  const inp = (placeholder, key, type = "text") => (
    <input value={form[key]} type={type}
      onChange={(e) => set(key, e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", border: "1px solid #ddd",
        borderRadius: 8, marginBottom: 10, boxSizing: "border-box", fontSize: 15 }} />
  );

  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>VaadVivaad</h1>
      <p style={{ color: "#666" }}>AI dispute resolution for MSME businesses</p>

      <h3 style={{ fontSize: 15, margin: "16px 0 8px" }}>Your Details</h3>
      {inp("Your name *", "complainant_name")}
      {inp("Your phone *", "complainant_phone", "tel")}

      <h3 style={{ fontSize: 15, margin: "16px 0 8px" }}>Dispute</h3>
      <select value={form.dispute_type} onChange={(e) => set("dispute_type", e.target.value)}
        style={{ width: "100%", padding: "10px 14px", border: "1px solid #ddd",
          borderRadius: 8, marginBottom: 10, fontSize: 15 }}>
        {DISPUTE_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>
      {inp("Amount in dispute (₹) *", "amount", "number")}
      {inp("Other party's name *", "respondent_name")}
      {inp("Other party's phone", "respondent_phone", "tel")}

      <h3 style={{ fontSize: 15, margin: "16px 0 8px" }}>Your Statement *</h3>
      <textarea value={form.complainant_statement}
        onChange={(e) => set("complainant_statement", e.target.value)}
        placeholder="Describe what happened. Be specific about dates, amounts, and what was agreed..."
        rows={5}
        style={{ width: "100%", padding: "10px 14px", border: "1px solid #ddd",
          borderRadius: 8, marginBottom: 10, boxSizing: "border-box", fontSize: 15 }} />

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, padding: 10, color: "#dc2626", marginBottom: 10 }}>
          {error}
        </div>
      )}

      <button onClick={submit} disabled={loading}
        style={{ width: "100%", padding: "12px", background: "#7c3aed",
          color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
          fontSize: 16, opacity: loading ? 0.7 : 1 }}>
        {loading ? "Filing..." : "File Dispute"}
      </button>
      <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 8 }}>
        AI mediation powered by Sarvam-105B via AIKosh
      </p>
    </div>
  );
}
```

## Setup & Run

```bash
pip install -r requirements.txt
mkdir -p data

# Get Sarvam API key (free): https://www.sarvam.ai/
# Get Anthropic API key (fallback): https://console.anthropic.com/
cp .env.example .env

uvicorn backend.main:app --reload

# Test
curl -X POST http://localhost:8000/dispute/file \
  -H "Content-Type: application/json" \
  -d '{
    "dispute_type": "payment_default",
    "amount": 25000,
    "complainant_name": "Rajesh Kumar",
    "complainant_phone": "9876543210",
    "complainant_statement": "I delivered 500kg of rice to Sharma Trading on March 15. Invoice #INV-2024-445 for ₹25,000. They have not paid despite 3 reminders.",
    "respondent_name": "Sharma Trading",
    "language": "hi"
  }'
```

---

# 5. HindiDiff

> Hindi text-to-image using Baaz-v1 from AIKosh — for Indian creators.
> **Earn:** ₹99/month for unlimited images. B2B API for ShareChat, Josh, Moj.

## Architecture

```
Hindi Prompt (User)
      ↓
Next.js Frontend (Vercel — free)
      ↓
FastAPI Backend (Render.com — free)
      ↓
┌────────────────────────────────────────────┐
│  AIKosh Free Model                         │
│  • Baaz-v1 — Hindi Text-to-Image GAN       │
│    Central University of Punjab            │
│  + Bhashini Translation (for Hinglish)     │
└────────────────────────────────────────────┘
      ↓
Generated Image → S3/Cloudinary (free tier)
      ↓
User Downloads / Shares
```

## File Structure

```
hindidiff/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── baaz.py           # Baaz-v1 model wrapper
│   ├── translate.py      # Hindi prompt normalization
│   ├── storage.py        # Image storage (Cloudinary free)
│   └── quota.py          # Free/paid quota management
├── frontend/
│   └── pages/
│       └── index.jsx     # Generator UI
└── requirements.txt
```

## `requirements.txt`

```
fastapi==0.111.0
uvicorn==0.30.0
torch==2.3.0
transformers==4.42.0
diffusers==0.27.2
huggingface-hub==0.23.4
Pillow==10.3.0
httpx==0.27.0
cloudinary==1.40.0
python-dotenv==1.0.1
sqlite-utils==3.36
```

## `backend/baaz.py` — Baaz-v1 Model Wrapper

```python
"""
Baaz-v1 — Hindi Text-to-Image Generation Model.
Published by Central University of Punjab on AIKosh.
HuggingFace: cup-punjab/Baaz-v1 (check AIKosh for latest model ID)
Model page: https://aikosh.indiaai.gov.in/home/models/all

This uses the Diffusers library for generation.
For CPU: slow (~5 min/image). Use AIKosh GPU notebook (free A100) for training/batch.
For production: run on Render GPU instance ($0 for first 750 GPU hours/month).
"""
from diffusers import StableDiffusionPipeline
from PIL import Image
import torch
import io
import base64
from functools import lru_cache

# Baaz-v1 model ID — verify current ID on AIKosh/HuggingFace
MODEL_ID = "cup-punjab/Baaz-v1"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Image size options (Baaz-v1 supports 512x512 natively)
SIZE_OPTIONS = {
    "square": (512, 512),       # Instagram post
    "portrait": (512, 768),     # Story/Reel
    "landscape": (768, 512),    # Banner
    "thumbnail": (256, 256),    # Thumbnail
}


@lru_cache(maxsize=1)
def load_pipeline() -> StableDiffusionPipeline:
    """Load Baaz-v1 pipeline. Cached after first load."""
    print(f"Loading Baaz-v1 on {DEVICE}...")
    dtype = torch.float16 if DEVICE == "cuda" else torch.float32
    pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=dtype,
        safety_checker=None,  # Custom safety handled separately
        requires_safety_checker=False,
    )
    pipe = pipe.to(DEVICE)
    if DEVICE == "cuda":
        pipe.enable_attention_slicing()  # Reduce VRAM usage
    print("Baaz-v1 loaded successfully!")
    return pipe


def generate_image(
    hindi_prompt: str,
    negative_prompt: str = "blurry, distorted, low quality, nsfw",
    size: str = "square",
    num_inference_steps: int = 30,
    guidance_scale: float = 7.5,
    seed: int = None,
) -> dict:
    """
    Generate an image from a Hindi text prompt using Baaz-v1.

    hindi_prompt: Text in Hindi/Devanagari or Hinglish
    size: One of "square", "portrait", "landscape", "thumbnail"
    Returns: {"image_base64": str, "prompt": str, "seed": int}
    """
    pipe = load_pipeline()
    width, height = SIZE_OPTIONS.get(size, (512, 512))

    generator = None
    if seed is not None:
        generator = torch.Generator(device=DEVICE).manual_seed(seed)
    else:
        import random
        seed = random.randint(0, 2**32 - 1)
        generator = torch.Generator(device=DEVICE).manual_seed(seed)

    with torch.inference_mode():
        result = pipe(
            prompt=hindi_prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            generator=generator,
        )

    image = result.images[0]

    # Convert to base64 for API response
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    img_b64 = base64.b64encode(buffer.getvalue()).decode()

    return {
        "image_base64": img_b64,
        "prompt": hindi_prompt,
        "seed": seed,
        "size": f"{width}x{height}",
        "model": "Baaz-v1 (AIKosh/Central University of Punjab)",
    }


def generate_variations(
    hindi_prompt: str,
    n: int = 4,
    size: str = "square",
) -> list[dict]:
    """Generate multiple variations of the same prompt."""
    import random
    seeds = [random.randint(0, 2**32 - 1) for _ in range(n)]
    return [generate_image(hindi_prompt, size=size, seed=s) for s in seeds]
```

## `backend/translate.py` — Hindi Prompt Normalization

```python
"""
Normalize Hindi/Hinglish prompts for better Baaz-v1 generation.
Converts Hinglish to proper Hindi using Bhashini.
Adds artistic style modifiers.
"""
import httpx
import os
import re

STYLE_ENHANCERS = {
    "portrait": "यथार्थवादी चित्र, उच्च गुणवत्ता, विस्तृत, पेशेवर फोटोग्राफी",
    "art": "डिजिटल कला, रंगीन, विस्तृत चित्रण",
    "cartoon": "कार्टून शैली, चमकीले रंग, एनिमेशन",
    "traditional": "भारतीय पारंपरिक कला, राजस्थानी शैली, विस्तृत",
    "wedding": "भव्य भारतीय विवाह, रंगीन, पारंपरिक परिधान",
    "nature": "प्राकृतिक दृश्य, यथार्थवादी, सुंदर परिदृश्य",
}

# Common Hinglish to Hindi mappings
HINGLISH_MAP = {
    "beautiful": "सुंदर",
    "girl": "लड़की",
    "boy": "लड़का",
    "photo": "फोटो",
    "India": "भारत",
    "village": "गाँव",
    "city": "शहर",
    "temple": "मंदिर",
    "bride": "दुल्हन",
    "groom": "दूल्हा",
    "festival": "त्योहार",
    "flower": "फूल",
    "mountain": "पहाड़",
    "river": "नदी",
    "sunset": "सूर्यास्त",
    "sunrise": "सूर्योदय",
}


def normalize_prompt(prompt: str, style: str = "art") -> str:
    """
    Normalize a Hindi/Hinglish prompt for Baaz-v1.
    - Convert Hinglish words to Hindi
    - Add style enhancers
    - Clean up formatting
    """
    # Convert common Hinglish to Hindi
    normalized = prompt
    for english, hindi in HINGLISH_MAP.items():
        normalized = re.sub(r'\b' + english + r'\b', hindi, normalized, flags=re.IGNORECASE)

    # Add style enhancer
    style_addition = STYLE_ENHANCERS.get(style, STYLE_ENHANCERS["art"])
    full_prompt = f"{normalized}, {style_addition}"

    return full_prompt


async def translate_to_hindi(text: str) -> str:
    """Translate English to Hindi using Bhashini (for mixed inputs)."""
    api_key = os.getenv("BHASHINI_API_KEY")
    if not api_key:
        return text  # Return as-is if no API key

    # Detect if text is mostly English
    english_chars = sum(1 for c in text if c.isascii() and c.isalpha())
    total_chars = sum(1 for c in text if c.isalpha())
    if total_chars == 0 or english_chars / total_chars < 0.5:
        return text  # Already mostly Hindi

    # Call Bhashini translation
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Simplified Bhashini translation call
            r = await client.post(
                "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
                headers={"Authorization": api_key},
                json={
                    "pipelineTasks": [{
                        "taskType": "translation",
                        "config": {
                            "language": {"sourceLanguage": "en", "targetLanguage": "hi"}
                        }
                    }],
                    "inputData": {"input": [{"source": text}]}
                }
            )
            result = r.json()
            return result.get("pipelineResponse", [{}])[0].get("output", [{}])[0].get("target", text)
    except Exception:
        return text
```

## `backend/quota.py` — Free/Paid Quota Management

```python
"""
Simple quota management for freemium model.
Free: 10 images/day
Paid (₹99/month): Unlimited
Uses SQLite for tracking (no external service needed).
"""
import sqlite3
from datetime import datetime, date

DB_PATH = "./data/quotas.db"


def init_quota_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS usage (
            ip_or_user TEXT NOT NULL,
            date TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            PRIMARY KEY (ip_or_user, date)
        );
        CREATE TABLE IF NOT EXISTS paid_users (
            user_id TEXT PRIMARY KEY,
            email TEXT,
            paid_until TEXT,
            created_at TEXT
        );
    """)
    conn.commit()
    conn.close()


def check_and_increment_quota(ip: str, limit: int = 10) -> dict:
    """
    Check if user has quota remaining and increment usage.
    Returns: {"allowed": bool, "used": int, "limit": int}
    """
    today = str(date.today())
    conn = sqlite3.connect(DB_PATH)

    row = conn.execute(
        "SELECT count FROM usage WHERE ip_or_user = ? AND date = ?",
        [ip, today]
    ).fetchone()

    current = row[0] if row else 0

    if current >= limit:
        conn.close()
        return {"allowed": False, "used": current, "limit": limit, "reason": "daily_limit"}

    # Increment
    conn.execute(
        """INSERT INTO usage (ip_or_user, date, count) VALUES (?, ?, 1)
           ON CONFLICT(ip_or_user, date) DO UPDATE SET count = count + 1""",
        [ip, today]
    )
    conn.commit()
    conn.close()
    return {"allowed": True, "used": current + 1, "limit": limit}


def is_paid_user(user_id: str) -> bool:
    """Check if user has active paid subscription."""
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        "SELECT paid_until FROM paid_users WHERE user_id = ?", [user_id]
    ).fetchone()
    conn.close()
    if not row:
        return False
    return row[0] >= str(date.today())
```

## `backend/main.py` — FastAPI Application

```python
"""
HindiDiff Backend — Hindi Text-to-Image using Baaz-v1
"""
import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
import base64
from dotenv import load_dotenv

from backend.baaz import generate_image, generate_variations
from backend.translate import normalize_prompt, translate_to_hindi
from backend.quota import init_quota_db, check_and_increment_quota

load_dotenv()
init_quota_db()

app = FastAPI(title="HindiDiff", description="Hindi text-to-image using Baaz-v1 (AIKosh)")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

STYLES = ["art", "portrait", "cartoon", "traditional", "wedding", "nature"]
SIZES = ["square", "portrait", "landscape", "thumbnail"]


class GenerateRequest(BaseModel):
    prompt: str
    style: str = "art"
    size: str = "square"
    seed: Optional[int] = None
    variations: int = 1  # 1-4


@app.get("/")
async def root():
    return {
        "status": "HindiDiff running",
        "model": "Baaz-v1 (AIKosh / Central University of Punjab)",
        "styles": STYLES,
        "sizes": SIZES,
    }


@app.post("/generate")
async def generate(req: GenerateRequest, request: Request):
    """Generate image from Hindi prompt."""
    client_ip = request.client.host

    if req.variations not in [1, 2, 3, 4]:
        raise HTTPException(400, "variations must be 1-4")
    if req.style not in STYLES:
        raise HTTPException(400, f"style must be one of: {STYLES}")
    if req.size not in SIZES:
        raise HTTPException(400, f"size must be one of: {SIZES}")

    # Check quota (free: 10/day)
    quota = check_and_increment_quota(client_ip, limit=10)
    if not quota["allowed"]:
        raise HTTPException(
            429,
            detail={
                "error": "daily_limit_reached",
                "message": "आपकी आज की 10 निःशुल्क छवियाँ समाप्त हो गई हैं। ₹99/माह में असीमित छवियाँ पाएं।",
                "upgrade": "https://hindidiff.in/upgrade",
            },
        )

    # Translate/normalize prompt
    hindi_prompt = await translate_to_hindi(req.prompt)
    enhanced_prompt = normalize_prompt(hindi_prompt, style=req.style)

    # Generate
    if req.variations == 1:
        result = generate_image(enhanced_prompt, size=req.size, seed=req.seed)
        images = [result]
    else:
        images = generate_variations(enhanced_prompt, n=req.variations, size=req.size)

    return {
        "prompt_original": req.prompt,
        "prompt_enhanced": enhanced_prompt,
        "images": [
            {
                "image_base64": img["image_base64"],
                "seed": img["seed"],
                "size": img["size"],
            }
            for img in images
        ],
        "quota": {"used": quota["used"], "limit": quota["limit"]},
        "model": "Baaz-v1 (AIKosh)",
    }


@app.get("/image/{seed}")
async def get_image(seed: int, prompt: str, size: str = "square"):
    """Regenerate a specific image by seed (deterministic)."""
    result = generate_image(prompt, size=size, seed=seed)
    img_bytes = base64.b64decode(result["image_base64"])
    return Response(content=img_bytes, media_type="image/png")


@app.get("/styles")
async def list_styles():
    """List available art styles."""
    return {
        "styles": [
            {"id": "art", "name": "Digital Art", "desc": "डिजिटल कला"},
            {"id": "portrait", "name": "Realistic Portrait", "desc": "यथार्थवादी चित्र"},
            {"id": "cartoon", "name": "Cartoon", "desc": "कार्टून शैली"},
            {"id": "traditional", "name": "Traditional Indian", "desc": "भारतीय पारंपरिक"},
            {"id": "wedding", "name": "Wedding", "desc": "विवाह"},
            {"id": "nature", "name": "Nature", "desc": "प्राकृतिक दृश्य"},
        ]
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
```

## `frontend/pages/index.jsx` — Image Generator UI

```jsx
// HindiDiff — Hindi Text-to-Image Generator
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STYLES = [
  { id: "art", label: "🎨 डिजिटल कला" },
  { id: "portrait", label: "📸 चित्र" },
  { id: "cartoon", label: "🖼️ कार्टून" },
  { id: "traditional", label: "🏛️ पारंपरिक" },
  { id: "wedding", label: "💍 विवाह" },
  { id: "nature", label: "🌿 प्रकृति" },
];

const SIZES = [
  { id: "square", label: "■ वर्गाकार (Instagram)" },
  { id: "portrait", label: "▬ लंबा (Story)" },
  { id: "landscape", label: "▬ चौड़ा (Banner)" },
];

const EXAMPLES = [
  "एक राजस्थानी दुल्हन, रंगीन लहंगा, हवेली के सामने",
  "वाराणसी के घाट पर सूर्यास्त, नाव, दीपक",
  "एक किसान अपने खेत में, सूरजमुखी के फूल, सुनहरी धूप",
  "ताजमहल, पूर्णिमा की रात, प्रतिबिंब",
  "एक बुजुर्ग दादी, चरखा कातती हुई, गाँव का घर",
];

export default function HindiDiff() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("art");
  const [size, setSize] = useState("square");
  const [variations, setVariations] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!prompt.trim()) { setError("कृपया एक विवरण दर्ज करें"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, size, variations }),
      });
      if (res.status === 429) {
        const e = await res.json();
        setError(e.detail?.message || "दैनिक सीमा समाप्त");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setResult(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const downloadImage = (b64, seed) => {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${b64}`;
    a.download = `hindidiff_${seed}.png`;
    a.click();
  };

  return (
    <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>HindiDiff</h1>
      <p style={{ color: "#6b7280" }}>हिंदी में लिखें, AI छवि पाएं • Powered by Baaz-v1 (AIKosh)</p>

      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
        placeholder="हिंदी में वर्णन करें... जैसे: एक राजस्थानी दुल्हन, रंगीन लहंगा पहने, महल के सामने खड़ी है"
        rows={3}
        style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd",
          borderRadius: 10, fontSize: 16, boxSizing: "border-box",
          fontFamily: "inherit", marginBottom: 4 }} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => setPrompt(e)}
            style={{ fontSize: 11, padding: "4px 10px", background: "#f3f4f6",
              border: "1px solid #e5e7eb", borderRadius: 20, cursor: "pointer" }}>
            {e.slice(0, 30)}...
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>शैली</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {STYLES.map((s) => (
              <button key={s.id} onClick={() => setStyle(s.id)}
                style={{ padding: "6px 12px", border: `1px solid ${style === s.id ? "#7c3aed" : "#e5e7eb"}`,
                  borderRadius: 8, background: style === s.id ? "#f5f3ff" : "#fff",
                  color: style === s.id ? "#7c3aed" : "#374151", cursor: "pointer", fontSize: 13 }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>आकार</div>
          <select value={size} onChange={(e) => setSize(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 }}>
            {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>विविधताएं</div>
          <select value={variations} onChange={(e) => setVariations(Number(e.target.value))}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 }}>
            {[1, 2, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={loading}
          style={{ padding: "10px 28px", background: "#7c3aed", color: "#fff",
            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16,
            opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}>
          {loading ? "बना रहे हैं..." : "✨ बनाएं"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, padding: 12, color: "#dc2626", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
            Prompt: <em>{result.prompt_enhanced?.slice(0, 80)}...</em>
          </div>
          <div style={{ display: "grid",
            gridTemplateColumns: result.images.length > 1 ? "1fr 1fr" : "1fr",
            gap: 12 }}>
            {result.images.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={`data:image/png;base64,${img.image_base64}`}
                  alt={`Generated image ${i + 1}`}
                  style={{ width: "100%", borderRadius: 10, display: "block" }} />
                <button onClick={() => downloadImage(img.image_base64, img.seed)}
                  style={{ position: "absolute", bottom: 8, right: 8,
                    padding: "6px 12px", background: "rgba(0,0,0,0.7)", color: "#fff",
                    border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                  ⬇ डाउनलोड
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
            {result.quota?.used}/{result.quota?.limit} आज की निःशुल्क छवियाँ उपयोग की गईं
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, padding: 16, background: "#f9fafb",
        borderRadius: 10, fontSize: 13, color: "#6b7280" }}>
        <strong>निःशुल्क:</strong> 10 छवियाँ/दिन &nbsp;|&nbsp;
        <strong>₹99/माह:</strong> असीमित छवियाँ &nbsp;|&nbsp;
        Model: <a href="https://aikosh.indiaai.gov.in" target="_blank"
          style={{ color: "#7c3aed" }}>Baaz-v1 (AIKosh)</a>
      </div>
    </div>
  );
}
```

## Setup & Run

```bash
pip install -r requirements.txt

# Note: Baaz-v1 downloads from HuggingFace on first run (~4GB)
# For faster dev: run on AIKosh GPU notebook (free A100 access)

uvicorn backend.main:app --reload

# Test generation
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "एक राजस्थानी दुल्हन, रंगीन लहंगा, हवेली के सामने",
    "style": "traditional",
    "size": "portrait",
    "variations": 1
  }'

# Frontend
cd frontend && npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

# Common Deployment Guide

## Free Hosting Stack (Zero Cost)

| Service | Use | Free Tier |
|---------|-----|-----------|
| Vercel | Next.js frontend | Unlimited deploys |
| Railway.app | FastAPI backend | 500 hrs/month |
| Render.com | FastAPI backend | 750 hrs/month |
| HuggingFace Spaces | Model hosting + demo | Free GPU for demos |
| AIKosh Notebook | GPU training (A100) | 4-22 hrs/day |
| Cloudinary | Image storage | 25GB free |
| Neon.tech | PostgreSQL (prod upgrade) | 512MB free |
| Twilio | Voice calls | $15 free trial |
| Sarvam AI | Multilingual LLM API | Free tier |
| Bhashini | Indian language APIs | Free (govt) |

## One-Click Deploy Commands

```bash
# Deploy backend to Railway
npm install -g @railway/cli
railway login
railway init
railway up

# Deploy frontend to Vercel
npm install -g vercel
vercel login
vercel --prod

# Deploy model demo to HuggingFace Spaces
pip install huggingface_hub
huggingface-cli login
# Create a Gradio demo wrapping any of these backends
# HuggingFace auto-deploys from GitHub on push
```

## Revenue Model Summary

| Product | Free Tier | Paid Tier | B2B |
|---------|-----------|-----------|-----|
| Kisan Voice AI | N/A | N/A | ₹5-50L govt contracts |
| PinAI | 5 queries/day | ₹299/month | NBFC data resale |
| DocPatram | 10 docs/day | ₹999/month | ₹10L-₹2Cr govt tenders |
| VaadVivaad | First dispute free | ₹499/dispute | Marketplace integrations |
| HindiDiff | 10 images/day | ₹99/month | API for ShareChat/Josh |

## AIKosh Resources Used (All Free)

| Product | Dataset/Model | AIKosh URL |
|---------|--------------|------------|
| Kisan Voice AI | KCC Transcripts dataset | aikosh.indiaai.gov.in/home/datasets |
| PinAI | Pincode Directory + Census data | aikosh.indiaai.gov.in/home/datasets |
| DocPatram | Patram 7B + OCR Toolkit + ARX | aikosh.indiaai.gov.in/home/models |
| VaadVivaad | Sarvam-105B model | aikosh.indiaai.gov.in/home/models |
| HindiDiff | Baaz-v1 model | aikosh.indiaai.gov.in/home/models |

---

*All code is MIT licensed. Built on Paul Graham's principle: make something people love using resources nobody else is using.*
*Start with the idea where you feel the need yourself — that's the one that will work.*
