# 🛡️ Edge Risk — Enterprise Project Intelligence

> **Master's PoC Submission · GenAI Track**
> Powered by Qwen 2.5-7B-Instruct via Hugging Face Inference API

---

## The Problem

Project Management Offices (PMOs) in mid-to-large enterprises receive dozens of project status reports every week. Risk identification is still largely manual — a senior analyst reads a 20-page PDF, highlights concerns, and writes a risk register by hand. This process is:

- **Slow** — takes 2–4 hours per report
- **Inconsistent** — depends on the analyst's experience and attention
- **Unscalable** — bottlenecks at the PMO level as project portfolios grow
- **Reactive** — risks are often surfaced after they have already materialized

---

## The Solution

**Edge Risk** is an AI-powered project intelligence platform that turns any PDF status report into a structured, quantified risk dashboard in under 60 seconds.

Upload a report → the system extracts text, sends it to a fine-tuned LLM, and returns:

- An **Executive Summary** of overall project health
- An **Overall Risk Score** (1–100) for portfolio-level triage
- **3–5 Identified Risks** with Probability, Impact, Category, and Recommended Mitigation
- An interactive **Threat Matrix** (Impact vs. Probability scatter plot)
- A **Persistent RAG Chat** — ask follow-up questions grounded in the document

All analysis is stored in a local SQLite database so past projects load instantly from the archive sidebar.

---

## Target Users

| Persona | Use Case |
|---|---|
| PMO Analyst | Rapid first-pass risk triage on incoming status reports |
| Project Manager | Self-service risk scoring before steering committee meetings |
| Portfolio Director | Consistent risk scoring across all projects for comparison |
| Auditor / Compliance | Evidence trail of identified risks and recommended mitigations |

---

## Key Features

- PDF upload and AI-powered structured risk extraction
- Threat Matrix visualization (Recharts scatter plot)
- Risk drill-down cards with category badges and mitigation guidance
- Persistent project archive (SQLite + SQLAlchemy)
- RAG Chat grounded in document context + structured analysis JSON
- Dark / Light theme toggle
- One-click PDF export of the full dashboard (html2canvas + jsPDF)

---

## AI Components Disclosure

| Component | Model | Provider | Purpose |
|---|---|---|---|
| Risk Extraction | `Qwen/Qwen2.5-7B-Instruct` | Hugging Face Router API | Structured JSON risk analysis from PDF text |
| RAG Chat | `Qwen/Qwen2.5-7B-Instruct` | Hugging Face Router API | Grounded Q&A against document + analysis context |

The system uses **no fine-tuning** and **no vector database**. Context is passed directly in the prompt (retrieval-augmented generation via prompt stuffing). See `RAI.md` for full responsible AI disclosure.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + Vite | 19.x / 8.x |
| Charts | Recharts | 3.x |
| PDF Export | jsPDF + html2canvas | 4.x / 1.x |
| HTTP Client | Axios | 1.x |
| Backend API | FastAPI + Uvicorn | latest |
| ORM | SQLAlchemy | latest |
| Database | SQLite | (bundled) |
| PDF Parsing | PyPDF2 | 3.0.1 |
| AI Inference | Hugging Face Router API | — |
| Container | Docker Compose | 3.8 |

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+ (or Docker)
- A Hugging Face account with a fine-grained API token (free tier works)

### 1. Clone and configure

```bash
git clone <your-repo-url>
cp .env.example .env
# Edit .env and add your HF_TOKEN
```

### 2. Start the backend

```bash
pip install -r requirements.txt
uvicorn main:app --reload
# API available at http://localhost:8000
```

### 3. Start the frontend

```bash
# Option A — Node directly
cd frontend
npm install
npm run dev

# Option B — Docker
docker compose up
# UI available at http://localhost:5173
```

### 4. Upload a PDF

Open `http://localhost:5173`, click **Select PDF Project Report**, choose any project status report, and click **Start AI Analysis**.

---

## Demo Link

> 🔗 **Live Demo:** `[PLACEHOLDER — add deployment URL here]`

---

## Team

| Name | Role |
|---|---|
| [Your Name] | Full-Stack Developer, AI Integration, Product Design |

*Solo Master's project submission.*

---

## Project Structure

```
edge-risk/
├── main.py              # FastAPI routes
├── risk_engine.py       # AI engine (extraction + RAG chat)
├── models.py            # SQLAlchemy ORM models
├── database.py          # DB engine + session factory
├── requirements.txt     # Python dependencies
├── docker-compose.yml   # Frontend container
├── .env.example         # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   ├── App.css      # Theme-aware styles
│   │   └── index.css    # Global reset
│   ├── package.json
│   └── vite.config.js
├── ARCHITECTURE.md
├── SECURITY.md
├── RAI.md
└── CHANGELOG.md
```

---

## License

MIT — see `LICENSE` for details.
