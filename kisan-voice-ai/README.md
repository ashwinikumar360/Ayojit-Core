# Kisan Voice AI

Kisan Voice AI is a voice-first agricultural helpdesk designed for regional farmers. It allows users to place inbound calls in their local dialect, transcribes and translates queries using the Bhashini API, queries Kisan Call Center (KCC) transcripts stored in a ChromaDB database, and speaks the resolution back to the caller.

## Integration & API Flow

1. **Twilio IVR Gate:** The call arrives via Twilio, executing the `/voice/inbound` endpoint to return standard TwiML instructions.
2. **Audio Transcription:** The farmer speaks, and Twilio gathers the spoken query, sending it to `/voice/process`.
3. **Bhashini Processing:** The ASR API transcribes the speech. If the query is non-English, it is translated.
4. **Knowledge Retrieval (RAG):** The text query is converted into embeddings using the multilingual sentence-transformer model and searched against Krishi Call Center Q&A documents in ChromaDB.
5. **Speech Synthesis:** The best-matching response is converted to speech via Bhashini TTS and streamed back to the caller.

## Configuration & Local Setup

### 1. Requirements
Ensure you have installed:
- Python 3.10+
- SQLite3
- Tesseract OCR (with Hindi language package `tessdata/hin.traineddata` configured on your path).

### 2. Dependencies
Install the required packages in your active environment:
```bash
pip install -r requirements.txt
```

### 3. Ingestion
Before running the voice server, run the database ingestion script to populate ChromaDB with sample KCC Q&A pairs:
```bash
python data/ingest_kcc.py
```

### 4. Running the Service
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Production Deployment (Render.com)

1. Create a new Web Service on Render linking this directory.
2. Configure environment keys:
   - `SUPABASE_URL` and keys for JWT validation.
   - `TWILIO_AUTH_TOKEN` (required for request validation).
   - `BHASHINI_API_KEY` and `BHASHINI_USER_ID` for language pipelines.
3. Configure the webhook url in your Twilio console:
   `https://[your-render-endpoint]/voice/inbound`.

## B2G Departmental Pitch

State agriculture departments can deploy Kisan Voice AI as an automated, 24/7 advisory system. By replacing traditional call-center desks with a consolidated RAG database and speech synthesis pipeline, departments can scale their daily resolved queries by 10x without increasing staffing costs. All caller details are securely logged using SHA-256 phone hashing to comply with the DPDP Act 2023.
