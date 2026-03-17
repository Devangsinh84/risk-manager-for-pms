# Architecture — Edge Risk

## Overview

Edge Risk follows a classic **3-tier web architecture** extended with an **AI inference layer** and a **persistence layer**. The system is intentionally kept simple for a PoC: no message queue, no vector store, no microservices — just clean separation of concerns across five layers.

---

## 10-Layer Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — USER INTERFACE (Browser)                                 │
│  React 19 + Vite 8  ·  http://localhost:5173                        │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Welcome /   │  │  Analytics   │  │      Chat RAG            │  │
│  │  Upload      │  │  Dashboard   │  │  (Persistent History)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Axios HTTP (JSON / multipart)
┌────────────────────────────▼────────────────────────────────────────┐
│  LAYER 2 — API GATEWAY (FastAPI)                                    │
│  main.py  ·  http://localhost:8000                                  │
│                                                                     │
│  POST /api/projects          — Upload PDF, run analysis, save       │
│  GET  /api/projects          — List all archived projects           │
│  GET  /api/projects/{id}     — Load saved dashboard                 │
│  DELETE /api/projects/{id}   — Remove project                       │
│  GET  /api/projects/{id}/chat — Load chat history                   │
│  POST /api/projects/{id}/chat — Send message, get AI reply          │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Python function call
┌────────────────────────────▼────────────────────────────────────────┐
│  LAYER 3 — BUSINESS LOGIC (Risk Engine)                             │
│  risk_engine.py  ·  RiskAnalyzerEngine class                        │
│                                                                     │
│  extract_text(pdf_file)   — PyPDF2 → raw string (capped 1500 chars) │
│  analyze(document_text)   — Structured JSON risk extraction prompt  │
│  ask_question(text, q, json) — Grounded RAG Q&A prompt              │
└──────────────┬─────────────────────────────┬───────────────────────┘
               │ HTTPS POST                  │ Python ORM call
┌──────────────▼──────────────┐  ┌───────────▼───────────────────────┐
│  LAYER 4 — AI INFERENCE     │  │  LAYER 5 — ORM / DATA ACCESS      │
│  Hugging Face Router API    │  │  SQLAlchemy  ·  models.py          │
│                             │  │                                    │
│  Model:                     │  │  Project     — id, name, created   │
│  Qwen/Qwen2.5-7B-Instruct   │  │  Document    — extracted_text,     │
│                             │  │               risk_analysis_json   │
│  Endpoint:                  │  │  ChatMessage — role, text,         │
│  router.huggingface.co/v1/  │  │               timestamp            │
│  chat/completions           │  │                                    │
│                             │  │  Session factory: database.py      │
└──────────────┬──────────────┘  └───────────┬───────────────────────┘
               │ JSON response               │ SQL
┌──────────────▼──────────────┐  ┌───────────▼───────────────────────┐
│  LAYER 6 — PROMPT LAYER     │  │  LAYER 7 — PERSISTENCE            │
│  Structured system prompts  │  │  SQLite  ·  enterprise_risk.db     │
│  in risk_engine.py          │  │  (local file, no server required)  │
│                             │  │                                    │
│  - Analysis prompt: forces  │  │  Tables:                           │
│    strict JSON schema       │  │    projects                        │
│  - Chat prompt: grounds     │  │    documents                       │
│    answer in context only   │  │    chat_messages                   │
│  - Regex JSON extraction    │  │                                    │
└─────────────────────────────┘  └────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 8 — PRESENTATION / RENDERING                                 │
│  React component tree in App.jsx                                    │
│                                                                     │
│  renderSidebar()       — Project archive + theme toggle             │
│  renderWelcomeScreen() — Upload zone + feature highlights           │
│  renderDashboard()     — Executive summary, scatter chart, cards    │
│  renderChat()          — Message bubbles, typing indicator, input   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 9 — STYLING / THEMING                                        │
│  App.css  ·  CSS custom properties (variables)                      │
│                                                                     │
│  :root { }              — Dark theme (default)                      │
│  [data-theme="light"]   — Light theme overrides                     │
│  Transition: 0.3s ease on all theme-sensitive properties            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 10 — INFRASTRUCTURE / CONTAINER                              │
│  docker-compose.yml                                                 │
│                                                                     │
│  Service: frontend (node:latest)                                    │
│  Port mapping: 5173:5173                                            │
│  Volume: ./frontend:/app                                            │
│  Backend runs natively (uvicorn) — not containerized in PoC        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow — PDF Upload to Dashboard

```
User selects PDF
      │
      ▼
React: FormData POST → /api/projects
      │
      ▼
FastAPI: receives UploadFile
      │
      ▼
RiskAnalyzerEngine.extract_text()
  └─ PyPDF2 reads pages
  └─ Concatenates text, caps at 1500 chars
      │
      ▼
RiskAnalyzerEngine.analyze(document_text)
  └─ Builds structured prompt with strict JSON schema
  └─ POST → HF Router API (Qwen2.5-7B-Instruct)
  └─ Receives raw LLM response
  └─ Regex extracts JSON block  { ... }
  └─ json.loads() → Python dict
      │
      ▼
FastAPI: saves to SQLite
  └─ INSERT INTO projects (name)
  └─ INSERT INTO documents (extracted_text, risk_analysis_json)
      │
      ▼
FastAPI: returns { project_id, name, data }
      │
      ▼
React: setResults(data), setActiveProjectId(id)
  └─ Second GET /api/projects/{id} → sets documentText state
  └─ Renders dashboard (summary, scatter chart, risk cards)
```

---

## Data Flow — RAG Chat

```
User types question → clicks Send
      │
      ▼
React: POST /api/projects/{id}/chat
  Body: { question, document_text, analysis_json }
      │
      ▼
FastAPI: saves user ChatMessage to DB
      │
      ▼
RiskAnalyzerEngine.ask_question(doc_text, question, analysis_json)
  └─ Builds context string:
       "--- ORIGINAL DOCUMENT ---\n{doc_text[:1500]}"
       "--- AI RISK ANALYSIS ---\n{analysis_json[:2000]}"
  └─ System prompt: answer only from context, use markdown formatting
  └─ POST → HF Router API
  └─ Returns answer string
      │
      ▼
FastAPI: saves AI ChatMessage to DB
      │
      ▼
React: appends AI bubble to chatHistory
  └─ formatMessage() renders markdown (bold, bullets, numbered lists)
  └─ Auto-scrolls to bottom
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| SQLite over PostgreSQL | Zero-config for PoC; swap to Postgres by changing `SQLALCHEMY_DATABASE_URL` |
| Prompt stuffing over vector DB | 1500-char context fits in one prompt; no Pinecone/Chroma dependency needed |
| 7B model over 70B | 10–15× cheaper per token, latency under 10s, sufficient for structured extraction |
| Text cap at 1500 chars | Keeps prompt within model context window and controls inference cost |
| JSON regex extraction | LLMs occasionally wrap JSON in markdown fences; regex makes parsing robust |
| CSS variables for theming | Zero JS overhead; instant theme switch via `data-theme` attribute on `<body>` |
