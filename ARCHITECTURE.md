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

```mermaid
   graph TB
       subgraph Client_Layer ["Layer 1 & 10: UX & Interface (React 19 + Vite)"]
           UI[Dashboard / Upload / Chat UI]
           Export[PDF Export - jsPDF]
           Charts[Threat Matrix - Recharts]
       end
   
       subgraph API_Layer ["Layer 5: Orchestration (FastAPI)"]
           Endpoints[REST Endpoints /api/projects]
           Logic[Business Logic - risk_engine.py]
       end
   
       subgraph Data_Layer ["Layer 3 & 4: Persistence & RAG (SQLite + SQLAlchemy)"]
           DB[(SQLite: enterprise_risk.db)]
           ORM[SQLAlchemy Models]
       end
   
       subgraph AI_Inference ["Layer 2: Foundation Model"]
           HF[Hugging Face Router API]
           Model[Qwen 2.5-7B-Instruct]
       end
   
       %% Interactions
       UI <-->|Axios / JSON| Endpoints
       Endpoints <--> ORM
       ORM <--> DB
       Endpoints --> Logic
       Logic <-->|HTTPS / Prompt Stuffing| HF
       HF <--> Model
   
       %% Modern Styling
       style UI fill:#003366,stroke:#fff,stroke-width:2px,color:#fff
       style Endpoints fill:#004d40,stroke:#fff,stroke-width:2px,color:#fff
       style DB fill:#5d4037,stroke:#fff,stroke-width:2px,color:#fff
       style Model fill:#4a148c,stroke:#fff,stroke-width:2px,color:#fff
       style Logic fill:#2e7d32,stroke:#fff,stroke-width:2px,color:#fff
       
       %% Subgraph Styling
       style Client_Layer fill:#f0f4f8,stroke:#003366,stroke-dasharray: 5 5
       style API_Layer fill:#f1f8e9,stroke:#2e7d32,stroke-dasharray: 5 5
       style Data_Layer fill:#efebe9,stroke:#5d4037,stroke-dasharray: 5 5
       style AI_Inference fill:#f3e5f5,stroke:#4a148c,stroke-dasharray: 5 5
```

---

### A2. Data Flow — PDF Upload to Dashboard

```mermaid
   sequenceDiagram
       autonumber
       participant U as User (React Frontend)
       participant A as FastAPI (Backend)
       participant E as Risk Engine (PyPDF2)
       participant HF as Hugging Face (Qwen 2.5)
       participant DB as SQLite (Database)
   
       Note over U,DB: PDF Analysis Workflow
   
       U->>A: Upload PDF Report
       A->>E: extract_text()
       E-->>A: Raw Text (Capped 1500 chars)
       A->>HF: analyze(text) + JSON Schema Prompt
       HF-->>A: Structured JSON Response
       A->>A: Regex Extraction & Validation
       A->>DB: Save Project & Analysis
       DB-->>A: Confirmation
       A-->>U: JSON Data (Risks, Summary, Score)
       
       rect rgb(240, 244, 248)
           Note right of U: Dashboard Renders Matrix & Cards
       end
```

---

### A3. Data Flow — RAG Chat

```mermaid
   graph LR
       subgraph Input_Layer ["User Input"]
           Q[User Question]
       end
   
       subgraph Context_Assembly ["Context Assembly (Prompt Stuffing)"]
           Doc[Original Doc Context]
           Anal[Prior JSON Analysis]
           Prompt[System Instructions]
       end
   
       subgraph AI_Core ["AI Inference"]
           Qwen[Qwen 2.5-7B]
       end
   
       subgraph Persistence ["Storage"]
           ChatDB[(Chat History)]
       end
   
       Q --> Context_Assembly
       Doc --- Context_Assembly
       Anal --- Context_Assembly
       Prompt --- Context_Assembly
       
       Context_Assembly -->|Combined Prompt| Qwen
       Qwen -->|Markdown Answer| ChatDB
       ChatDB --> UI[Chat Interface]
   
       %% Modern Styling for Consistency
       style Q fill:#003366,stroke:#fff,stroke-width:2px,color:#fff
       style Context_Assembly fill:#f1f8e9,stroke:#2e7d32,stroke-dasharray: 5 5
       style Qwen fill:#4a148c,stroke:#fff,stroke-width:2px,color:#fff
       style ChatDB fill:#5d4037,stroke:#fff,stroke-width:2px,color:#fff
       style Doc fill:#2e7d32,stroke:#fff,color:#fff
       style Anal fill:#2e7d32,stroke:#fff,color:#fff
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
