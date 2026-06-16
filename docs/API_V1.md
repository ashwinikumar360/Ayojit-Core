# API v1 Reference

Public API for third-party integrations. Authenticate with an API key.

## Authentication

All API v1 endpoints require an `X-API-Key` header.

```bash
curl -H "X-API-Key: ak_your_key_here" \
     https://api.ayojit.com/v1/status
```

### Generating an API Key

1. Go to Dashboard → Settings → API Keys
2. Click "Generate New Key"
3. Copy the key immediately (it is shown only once)
4. The key prefix (`ak_...`) is stored for identification

### Rate Limits

| Plan | Requests/minute |
|------|-----------------|
| Free | 30 |
| Pro  | 120 |

---

## Endpoints

### `GET /v1/status`

Returns operational status for all apps. No authentication required.

**Response:**
```json
{
  "statuses": [
    {"app_id": "pinai", "status": "operational", "message": "All systems running normally", "updated_at": "2026-06-16T00:00:00Z"},
    {"app_id": "docpatram", "status": "operational", "message": "All systems running normally", "updated_at": "2026-06-16T00:00:00Z"}
  ]
}
```

---

### `POST /v1/pinai/insight`

Get location intelligence for an Indian pincode.

**Scope required:** `pinai`

**Request:**
```json
{
  "pincode": "834001",
  "business_type": "retail"
}
```

**Response:**
```json
{
  "metrics": {
    "location": {
      "office": "Ranchi GPO",
      "district": "Ranchi",
      "state": "Jharkhand"
    },
    "business_signals": {
      "market_density_score": 7.2,
      "delivery_active": true,
      "population_proxy_enrolments": 284500
    }
  },
  "insight": "Moderate market density with strong delivery infrastructure..."
}
```

**Errors:**
| Code | Description |
|------|-------------|
| 400 | Invalid pincode (must be 6 digits) |
| 401 | Invalid API key |
| 403 | Missing `pinai` scope |
| 504 | PinAI service timeout |

---

### `POST /v1/docpatram/generate`

Generate a document from a template.

**Scope required:** `docpatram`

**Request:**
```json
{
  "template_id": "rent_agreement",
  "fields": {
    "landlord_name": "Rajesh Kumar",
    "tenant_name": "Priya Singh",
    "property_address": "123 MG Road, Ranchi",
    "monthly_rent": "15000"
  }
}
```

**Response:**
```json
{
  "title": "Rent Agreement",
  "url": "https://storage.example.com/docs/generated/abc123.pdf",
  "preview": "This Rent Agreement is executed on..."
}
```

---

### `POST /v1/hindidiff/generate`

Generate an image from a Hindi text prompt.

**Scope required:** `hindidiff`

**Request:**
```json
{
  "prompt": "एक सुंदर हिमालय का दृश्य सूर्योदय के समय"
}
```

**Response:**
```json
{
  "prompt": "एक सुंदर हिमालय का दृश्य सूर्योदय के समय",
  "image_url": "https://image.pollinations.ai/prompt/...",
  "seed": 42
}
```

**Errors:**
| Code | Description |
|------|-------------|
| 400 | Prompt too short (minimum 3 characters) |
| 504 | Image generation timeout (60s limit) |

---

## Error Format

All errors follow a consistent format:

```json
{
  "detail": "Human-readable error message"
}
```

## SDKs

No official SDKs yet. Use `curl`, `httpx`, or any HTTP client.

```python
import httpx

response = httpx.post(
    "https://api.ayojit.com/v1/pinai/insight",
    json={"pincode": "834001"},
    headers={"X-API-Key": "ak_your_key"},
)
print(response.json())
```

```javascript
const res = await fetch('https://api.ayojit.com/v1/pinai/insight', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'ak_your_key',
  },
  body: JSON.stringify({ pincode: '834001' }),
})
const data = await res.json()
```
