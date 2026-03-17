# Security Policy — Edge Risk

> This document covers secrets management, authentication, CORS policy, data residency, PII handling, and known security limitations for the Edge Risk PoC.

---

## 1. Secrets Management

### Policy

All secrets (API tokens, keys) **must** be stored in environment variables and never committed to source control.

### Implementation

A `.env.example` file is provided with placeholder values. The actual `.env` file is listed in `.gitignore`.

```
# .env.example
HF_TOKEN=your_huggingface_token_here
```

The token is loaded in `risk_engine.py`:

```python
import os
HF_TOKEN = os.getenv("HF_TOKEN", "")
```

> **Current PoC status:** The token is currently hardcoded in `risk_engine.py` for rapid development. Before any deployment or public repository push, it **must** be moved to an environment variable using `python-dotenv` or a secrets manager.

### Recommended Production Upgrade

```bash
pip install python-dotenv
```

```python
# risk_engine.py
from dotenv import load_dotenv
import os
load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN environment variable is not set.")
```

### Secret Rotation

- Hugging Face fine-grained tokens can be revoked and reissued from the HF settings page at any time.
- Tokens should be rotated every 90 days in a production environment.
- Never log the token value — the current logging setup logs API errors but not the Authorization header.

---

## 2. Authentication & Authorization

### Current State (PoC)

The PoC has **no authentication layer**. All API endpoints are publicly accessible to anyone who can reach `localhost:8000`. This is acceptable for a local development demo.

### Recommended Production Upgrade

| Layer | Recommendation |
|---|---|
| API Authentication | JWT bearer tokens via `fastapi-users` or `python-jose` |
| Frontend Auth | Auth0 or Supabase Auth (OAuth 2.0 / OIDC) |
| Per-project Authorization | Row-level security: each project linked to a `user_id` foreign key |
| Rate Limiting | `slowapi` middleware on FastAPI to prevent abuse of the HF inference endpoint |

---

## 3. CORS Policy

### Current Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # All origins allowed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

The wildcard `allow_origins=["*"]` is intentional for local development where the frontend port (5173) and backend port (8000) differ.

### Recommended Production Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-production-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

## 4. Data Residency

### Database

All project data is stored in a **local SQLite file** (`enterprise_risk.db`) on the machine running the FastAPI server. No data is sent to any cloud database.

```
enterprise_risk.db
├── projects       (id, name, created_at)
├── documents      (extracted_text, risk_analysis_json)
└── chat_messages  (role, text, timestamp)
```

**Data never leaves the local machine** except for the document text excerpt sent to the Hugging Face Inference API (see Section 5).

### Backup

SQLite is a single file — back it up by copying `enterprise_risk.db`. For production, migrate to PostgreSQL with automated backups.

---

## 5. PII Handling

### Data Sent to External API

The following data is sent to the Hugging Face Router API (external HTTPS endpoint):

- Up to **1500 characters** of extracted PDF text (risk extraction)
- Up to **1500 characters** of extracted PDF text + **2000 characters** of analysis JSON (chat)

### PII Risk

If the uploaded PDF contains Personally Identifiable Information (names, emails, phone numbers, financial account numbers), that data **may be included** in the text excerpt sent to Hugging Face.

### Current Mitigation

- Text is **truncated** to 1500 characters — reducing (but not eliminating) PII exposure.
- Hugging Face's Inference API Terms of Service state that inputs are not used for model training on the free tier (verify current ToS before production use).

### Recommended Production Mitigation

```python
import re

def redact_pii(text: str) -> str:
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
    text = re.sub(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', '[PHONE]', text)
    text = re.sub(r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b', '[CARD]', text)
    return text
```

Apply `redact_pii()` in `extract_text()` before truncation.

---

## 6. Dependency Security

### Python

```bash
pip install pip-audit
pip-audit -r requirements.txt
```

### Node.js

```bash
npm audit --audit-level=moderate
```

Run these checks before any public deployment. Pin all dependency versions (see `requirements.txt` and `package.json`).

---

## 7. Known Security Limitations (PoC Scope)

| Issue | Severity | Status |
|---|---|---|
| HF_TOKEN hardcoded in source | High | ⚠️ Must fix before any repo push |
| No authentication on API | High | ⚠️ Acceptable for local PoC only |
| Wildcard CORS | Medium | ⚠️ Acceptable for local PoC only |
| No PII redaction before API call | Medium | ⚠️ Future work |
| No HTTPS on local backend | Low | ⚠️ Add TLS termination (nginx) for production |
| No input size limit on PDF upload | Low | ⚠️ Add `max_upload_size` middleware |
| SQLite has no access control | Low | ⚠️ Acceptable for single-user PoC |
