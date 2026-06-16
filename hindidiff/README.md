# HindiDiff

HindiDiff is a Devanagari text-to-image generator proxy gateway designed to translate Hinglish/English input prompts into Hindi and forward them to a remote Hugging Face Space running diffusion models.

## Integration & API Flow

1. **Input Sanitization:** Prompts are sanitized to strip out HTML tags and checked against size limits.
2. **Translation & Expansion:** The prompt is translated into Devanagari Hindi using Bhashini APIs.
3. **Inference Offloading:** The translated and style-enhanced prompt is forwarded to the Hugging Face Space endpoint hosting the image model (such as Baaz-v1 or Flux-schnell).
4. **Cloudinary Archival:** The generated base64 image bytes are uploaded to Cloudinary, and the metadata is stored in the Supabase `generations` table.
5. **Offline Fallback:** If `HF_SPACE_URL` is empty, the backend executes `generate_offline_banner` locally using Pillow to output a stylized, dynamic Neo-Brutalist title graphic, ensuring the service remains active without external dependencies.

## Configuration & Local Setup

### 1. Requirements
Ensure you have installed:
- Python 3.10+
- Pillow (for offline banner generation).

### 2. Dependencies
Install requirements:
```bash
pip install -r requirements.txt
```

### 3. Run Server
```bash
uvicorn hindidiff.backend.main:app --host 127.0.0.1 --port 8004
```

## Production Deployment (Render.com)

1. Deploy this microservice folder to Render as a Web Service.
2. Ensure you set the `HF_SPACE_URL` environment key pointing to your Hugging Face Space running `hindidiff/app.py` in Docker.
3. In Dodo Payments, create a recurring subscription plan (₹99/mo) and set the product ID `DODO_PRODUCT_HINDIDIFF`.
