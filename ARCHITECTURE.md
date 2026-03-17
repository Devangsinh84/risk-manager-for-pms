# Edge Risk — Enterprise Architecture
### 10-Layer Framework | Investor-Ready Edition

> **Prepared for:** Prof. Skander
> **Project:** Edge Risk — AI-Powered Project Risk Intelligence Platform
> **Classification:** Strategic Architecture Document

---

## Executive Summary

Edge Risk is a production-grade, AI-native risk management platform built for Project Management Offices (PMOs). It **transforms** unstructured project documents into structured, quantified risk intelligence — in seconds. This document defines the 10-layer enterprise architecture that governs how Edge Risk is built, governed, and scaled, covering both the technical foundation and the organizational operating model.

---

## The 10-Layer Enterprise Architecture

---

### Layer 1 — Infrastructure

**Serverless-First. Containerized for Scale.**

Edge Risk is architected around a **serverless inference model**, eliminating the capital cost of owning and maintaining GPU hardware.

- **Delegates** all LLM inference to the Hugging Face Router API (`router.huggingface.co/v1/chat/completions`), consuming compute on-demand with zero idle cost.
- **Containerizes** the frontend service via Docker and `docker-compose.yml`, ensuring environment parity from a developer's laptop to a cloud VM with a single command (`docker compose up`).
- **Decouples** the backend (FastAPI/uvicorn) from the frontend container, enabling independent scaling of each tier as load grows.
- **Eliminates** infrastructure lock-in: swapping the inference provider requires changing one URL and one API key — no re-architecture needed.

> **Scalability Path:** Promote from SQLite → PostgreSQL and deploy the FastAPI backend as a containerized service to achieve full horizontal scalability with zero code changes.

---

### Layer 2 — Foundation Model

**Frugal AI: Doing More With Less.**

The choice of foundation model is a deliberate strategic and economic decision, not a default.

- **Selects** Qwen/Qwen2.5-7B-Instruct as the core reasoning engine — a 7-billion parameter instruction-tuned model optimized for structured output generation.
- **Rejects** top-tier 70B+ models on principle: for structured JSON extraction from short documents, a 7B model delivers **equivalent accuracy at 10–15× lower cost per token** and sub-10-second latency.
- **Enforces** a strict JSON output schema via system prompting, making the model's output deterministic and machine-parseable regardless of its size.
- **Preserves** the ability to upgrade: the model identifier is a single configuration value. Swapping to a larger model (e.g., Llama-3-70B) requires one line change.

| Model Tier | Cost | Latency | Accuracy (Structured Extraction) |
|---|---|---|---|
| 7B (Current) | Low | ~8s | Sufficient for PoC → Production |
| 70B (Future) | 10–15× higher | ~30s | Marginal gain for this use case |

> **Frugal AI Principle:** Maximize business value per token. Spend on model size only when accuracy benchmarks demand it.

---

### Layer 3 — Security

**Protect the Data. Guard the Model. Trust Nothing by Default.**

Security is not a feature — it is a constraint applied at every layer.

- **Filters** all inputs at the API boundary: only `.pdf` file types are accepted; all other uploads are rejected with a `400` error before reaching the AI engine.
- **Enforces** local data residency by design: all project data, extracted text, risk analysis, and chat history are persisted exclusively in a local SQLite database (`enterprise_risk.db`). **No project data is ever sent to a third-party storage service.**
- **Minimizes** PII exposure: the text extraction pipeline caps document ingestion at 1,500 characters and strips raw content after analysis. The LLM receives context, not raw personal data.
- **Isolates** the inference boundary: the only data transmitted externally is the anonymized, context-bounded prompt payload sent to the Hugging Face API over HTTPS.
- **Implements** output guardrails via regex-based JSON extraction, preventing prompt injection artifacts or malformed LLM outputs from reaching the application state.

> **Compliance Posture:** Local data residency makes Edge Risk compatible with GDPR and enterprise data governance policies without additional tooling.

---

### Layer 4 — Data

**From Raw Document to Structured Intelligence: The RAG Pipeline.**

Edge Risk implements a lightweight but production-sound Retrieval-Augmented Generation (RAG) pipeline without the overhead of a vector database.

- **Ingests** PDF documents via PyPDF2, iterating over all pages and concatenating extracted text into a single corpus.
- **Cleans** the corpus by capping it at 1,500 characters — a deliberate chunking strategy that fits within the model's effective context window while controlling inference cost.
- **Injects** context in two layers for the Chat RAG module:
  - `Layer A — Original Document:` the raw extracted text, providing grounding in source material.
  - `Layer B — AI Risk Analysis:` the structured JSON output from the analysis phase (risk names, scores, mitigations), providing grounding in derived intelligence.
- **Persists** both the raw text and the structured analysis JSON in SQLite, enabling instant dashboard reload and stateful chat without re-running inference.

> **Design Choice:** Prompt stuffing over a vector store. At 1,500-character context, a single prompt is more efficient than embedding, indexing, and retrieving chunks. The architecture is ready to adopt a vector store (e.g., ChromaDB) when document length demands it.

---

### Layer 5 — Application & Orchestration

**FastAPI as the Intelligent Middleware.**

The application layer orchestrates the full user journey — from document upload to AI response — through a clean, RESTful API contract.

- **Exposes** six purpose-built endpoints that map directly to user actions:

| Endpoint | Action |
|---|---|
| `POST /api/projects` | Upload PDF → run analysis → persist to DB |
| `GET /api/projects` | Fetch project archive for sidebar |
| `GET /api/projects/{id}` | Load saved dashboard instantly |
| `DELETE /api/projects/{id}` | Remove project and all associated data |
| `GET /api/projects/{id}/chat` | Restore persistent chat history |
| `POST /api/projects/{id}/chat` | Submit question → RAG inference → save reply |

- **Mediates** the user flow: the React frontend (Vite + React 19) communicates exclusively via Axios HTTP calls. The LLM is never called directly from the browser — all inference is server-side.
- **Manages** session state via SQLAlchemy ORM, ensuring every analysis and conversation is durable across browser refreshes and server restarts.
- **Deduplicates** uploads: re-uploading an existing document updates the record rather than creating a duplicate, protecting data integrity.

---

### Layer 6 — Sponsorship

**The PMO as Executive Sponsor: Breaking Organizational Silos.**

Technology without organizational alignment fails. Edge Risk is designed with a clear sponsorship model.

- **Designates** the Project Management Office (PMO) as the executive sponsor and primary champion of Edge Risk adoption across the organization.
- **Empowers** the PMO to mandate usage across project teams, ensuring consistent risk reporting standards and eliminating the fragmented, spreadsheet-based risk registers that create blind spots.
- **Bridges** the gap between IT (who owns the infrastructure and model registry) and Business Units (who own the project outcomes), with the PMO serving as the neutral governance authority.
- **Funds** the platform through the PMO budget, framing AI risk intelligence as a project delivery capability — not an IT experiment.
- **Drives** adoption by tying Edge Risk outputs to existing PMO gate review processes, making AI-generated risk reports a standard deliverable at project milestones.

> **Strategic Value:** A PMO-sponsored platform has organizational authority. It gets used. Ungoverned AI tools get ignored.

---

### Layer 7 — Business Process

**Human-in-the-Loop: AI Identifies, Humans Decide.**

Edge Risk augments human judgment — it does not replace it. The workflow is designed around a deliberate human checkpoint.

```
[1] PM uploads project status report (PDF)
        ↓
[2] AI Engine identifies 3–5 risks, scores probability & impact,
    generates Threat Matrix and recommended mitigations
        ↓
[3] PM reviews the AI-generated risk dashboard
        ↓
[4] PM interrogates findings via Chat RAG
    ("What are the legal risks?" / "Explain the threat matrix")
        ↓
[5] PM approves, modifies, or rejects each mitigation recommendation
        ↓
[6] Approved risk register is exported as a PDF report
    and submitted to the PMO gate review
```

- **Positions** the AI as a first-pass analyst that surfaces risks a human might miss under time pressure.
- **Preserves** PM accountability: no mitigation is actioned without explicit human review and approval.
- **Enables** audit trails: every chat interaction and analysis output is persisted, creating a documented decision history.

---

### Layer 8 — Governance

**Co-Ownership Between IT and Business.**

Sustainable AI requires shared accountability. Edge Risk defines a dual-ownership governance model.

- **IT owns the Model Registry:**
  - Manages the foundation model version (currently Qwen2.5-7B-Instruct).
  - Controls API key rotation, rate limit monitoring, and inference cost tracking.
  - Approves model upgrades and validates output quality before promotion.
  - Maintains the Docker infrastructure and deployment pipeline.

- **Business (PMO) owns the Output Audit:**
  - Reviews a random sample of AI-generated risk analyses monthly for accuracy and relevance.
  - Maintains a feedback log of incorrect or misleading AI outputs.
  - Defines the acceptable risk taxonomy (categories, scoring rubrics) that the AI prompt enforces.
  - Holds veto power over model changes that affect output format or business logic.

- **Establishes** a quarterly AI Governance Review where IT and PMO co-present model performance metrics, cost trends, and user feedback to senior leadership.

> **Governance Principle:** If IT owns everything, the business disengages. If the business owns everything, quality degrades. Co-ownership creates accountability on both sides.

---

### Layer 9 — Onboarding & Training

**Adoption is a Product Feature.**

The best platform fails if users don't trust it or know how to use it effectively.

- **Delivers** Prompt Engineering Workshops for PMs and project analysts:
  - How to ask effective questions in the Chat RAG interface.
  - How to interpret probability/impact scores and the Threat Matrix.
  - How to frame project documents to maximize AI extraction quality.

- **Runs** Responsible AI Awareness Labs for all users:
  - Understanding model limitations: hallucination risks, context window constraints, and when to override AI recommendations.
  - Data privacy obligations: what goes into a prompt, what stays local, and what never should be uploaded.
  - Bias awareness: recognizing when AI risk scores may reflect training data biases rather than project reality.

- **Provides** a Quick-Start Guide embedded in the platform's welcome screen, reducing time-to-first-analysis to under 5 minutes for new users.

- **Establishes** a Power User cohort within the PMO — trained advocates who support peer adoption and surface product improvement feedback.

---

### Layer 10 — UX / KPIs / Performance

**Measure What Matters.**

Edge Risk is accountable to three core performance indicators that directly map to business value.

---

**KPI 1 — Time Saved per Risk Assessment**

> *Baseline:* Manual risk identification from a project status report takes a senior PM 2–4 hours.
> *Target:* Edge Risk delivers a structured, scored risk dashboard in under 60 seconds.
> *Measurement:* Average time from PDF upload to dashboard render, tracked per session.

---

**KPI 2 — Risk Identification Error Reduction**

> *Baseline:* Manual reviews miss an estimated 30–40% of implicit risks buried in project narrative.
> *Target:* AI-assisted reviews surface 100% of document-referenced risks plus extrapolated logical risks.
> *Measurement:* Monthly audit comparing AI-identified risks against post-project retrospective findings.

---

**KPI 3 — User Trust & Feedback Loop**

> *Baseline:* No structured mechanism for PMs to signal AI output quality.
> *Target:* 80%+ of AI-generated mitigations rated "Accepted" or "Accepted with Modification" by PMs.
> *Measurement:* In-platform thumbs up/down feedback on each mitigation card, aggregated monthly and reviewed at the AI Governance Review (Layer 8).

---

## Appendix — Technical Deep-Dive

> The following diagrams are preserved for engineering reference. They are not intended for executive or investor audiences.

---

### A1. System Architecture Diagram

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
│  LAYER 5 — API GATEWAY (FastAPI)                                    │
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
│  BUSINESS LOGIC — Risk Engine                                       │
│  risk_engine.py  ·  RiskAnalyzerEngine class                        │
│                                                                     │
│  extract_text(pdf_file)      — PyPDF2 → raw string (cap 1500 chars) │
│  analyze(document_text)      — Structured JSON risk extraction      │
│  ask_question(text, q, json) — Grounded RAG Q&A                     │
└──────────────┬─────────────────────────────┬───────────────────────┘
               │ HTTPS POST                  │ ORM call
┌──────────────▼──────────────┐  ┌───────────▼───────────────────────┐
│  LAYER 2 — AI INFERENCE     │  │  DATA ACCESS — SQLAlchemy ORM      │
│  Hugging Face Router API    │  │  models.py / database.py           │
│  Qwen/Qwen2.5-7B-Instruct   │  │                                    │
│  router.huggingface.co/v1/  │  │  Project · Document · ChatMessage  │
│  chat/completions           │  │                                    │
└──────────────┬──────────────┘  └───────────┬───────────────────────┘
               │ JSON response               │ SQL
               │                 ┌───────────▼───────────────────────┐
               │                 │  LAYER 3 — PERSISTENCE            │
               │                 │  SQLite  ·  enterprise_risk.db     │
               │                 │  Tables: projects, documents,      │
               │                 │          chat_messages             │
               │                 └────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│  LAYER 1 — INFRASTRUCTURE / CONTAINER                               │
│  docker-compose.yml                                                 │
│  Service: frontend (node:latest) · Port: 5173:5173                  │
│  Backend: uvicorn (native) · Port: 8000                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

### A2. Data Flow — PDF Upload to Dashboard

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
  └─ PyPDF2 reads all pages
  └─ Concatenates text, caps at 1,500 chars
      │
      ▼
RiskAnalyzerEngine.analyze(document_text)
  └─ Builds structured prompt with strict JSON schema
  └─ POST → HF Router API (Qwen2.5-7B-Instruct)
  └─ Receives raw LLM response
  └─ Regex extracts JSON block { ... }
  └─ json.loads() → Python dict
      │
      ▼
FastAPI: persists to SQLite
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

### A3. Data Flow — RAG Chat

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
  └─ Builds two-layer context string:
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

### A4. Key Engineering Design Decisions

| Decision | Rationale |
|---|---|
| SQLite over PostgreSQL | Zero-config for PoC; swap by changing one `SQLALCHEMY_DATABASE_URL` value |
| Prompt stuffing over vector DB | 1,500-char context fits in one prompt; no Pinecone/Chroma dependency |
| 7B model over 70B | 10–15× cheaper per token, <10s latency, sufficient for structured extraction |
| Text cap at 1,500 chars | Keeps prompt within context window and controls inference cost |
| JSON regex extraction | Handles markdown-fenced JSON that LLMs occasionally produce |
| CSS variables for theming | Zero JS overhead; instant dark/light switch via `data-theme` on `<body>` |
| Local SQLite persistence | Full data residency — no project data leaves the host machine |
