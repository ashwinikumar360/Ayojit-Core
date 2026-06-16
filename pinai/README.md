# PinAI

PinAI is a hyperlocal business intelligence and coordinate finder that helps merchants evaluate local markets and pinpoint Aadhaar centers using open datasets.

## Integration & API Flow

1. **Query Inputs:** The frontend sends a 6-digit Indian pincode and the candidate business type (e.g., retail, education, pharmacy).
2. **Context Resolution:** The backend checks the local SQLite database containing postal registries and coordinates.
3. **LLM Insights:** The metrics (population densities, center counts, local infrastructure) are extracted, and a prompt is sent to OpenRouter (`google/gemma-2-9b-it:free`) to generate a 3-sentence executive insight report.
4. **Usage Check:** Capped daily limits (5 queries/day for Free users) are logged and enforced in real-time.

## Configuration & Local Setup

### 1. Requirements
Ensure you have installed:
- Python 3.10+
- SQLite3

### 2. Dataset Setup
1. Register on [aikosh.indiaai.gov.in](https://aikosh.indiaai.gov.in).
2. Download the **All India Pincode Directory** and **Aadhaar Update Center Directories** datasets.
3. Convert the source CSVs to SQLite format or place them inside `pinai/data` and run the dataloader setup script:
   ```bash
   python -c "from pinai.backend.data_loader import initialize_db; initialize_db()"
   ```

### 3. Dependencies
Install the required packages in your active environment:
```bash
pip install -r requirements.txt
```

### 4. Running the Service
```bash
uvicorn pinai.backend.main:app --host 127.0.0.1 --port 8001
```

## Production Deployment (Render.com)

1. Create a new Web Service on Render linking this directory.
2. Configure environment keys:
   - `SUPABASE_URL` and keys for JWT validation.
   - `OPENROUTER_API_KEY` to query OpenRouter models.
3. In Dodo Payments, create a recurring plan (₹299/mo) and set the product ID `DODO_PRODUCT_PINAI`. Verify subscription updates.
