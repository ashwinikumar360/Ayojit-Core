# DocPatram

DocPatram is a document translation, parsing, and structured reconstruction tool powered by the BharatGen Patram-7B Vision-Language Model (VLM).

## Integration & API Flow

1. **Upload Interception:** The client uploads document pages (PDFs or images, strictly capped at 10MB to avoid system out-of-memory errors).
2. **Text Extraction:** Scanned files run through PyTesseract to extract raw text content.
3. **PII Masking (DPDP Compliance):** The raw text is passed to Microsoft Presidio to locate and redact personal details (Person names, Aadhaar details, emails, locations) before further processing.
4. **VLM Parsing:** Scanned image frames are sent directly to the Hugging Face Space endpoint hosting Patram-7B to extract structured fields.
5. **Asset Archival:** Processed inputs are uploaded to Cloudinary, and transaction references are saved to the Supabase history database.

## Configuration & Local Setup

### 1. Prerequisites
Ensure you have installed:
- Python 3.10+
- Tesseract OCR (with multi-language packs config).
- Poppler (required by `pdf2image` to convert PDFs).

### 2. SpaCy Model Installation
Presidio requires a spaCy language model for text tagging. Run this in your virtual environment:
```bash
python -m spacy download en_core_web_sm
```

### 3. Dependencies
Install requirements:
```bash
pip install -r requirements.txt
```

### 4. Run Server
```bash
uvicorn docpatram.backend.main:app --host 127.0.0.1 --port 8002
```

## Production Deployment (Render.com)

1. Deploy this microservice folder to Render as a Web Service.
2. Ensure you set the `PATRAM_HF_SPACE_URL` environment key pointing to your Hugging Face Space running `docpatram/app.py` in Docker.
3. In Dodo Payments, create a recurring subscription plan (₹999/mo) and set the product ID `DODO_PRODUCT_DOCPATRAM`.
