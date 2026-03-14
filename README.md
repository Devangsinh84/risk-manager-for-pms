# 🛡️ Edge-AI Risk Analyzer

An enterprise-grade project risk intelligence tool that automatically extracts, scores, and visualizes risks from PDF project status reports — powered by the Qwen 2.5 language model via the Hugging Face Router API.

## Overview

Upload a PDF project report and the app will:
- Extract and analyze the document text
- Identify 3–5 distinct risks with probability and impact scores
- Generate an executive summary and an overall risk score (1–100)
- Plot risks on an interactive Probability vs. Impact matrix
- Let you chat with the document via a built-in RAG interface

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Charts | Recharts |
| HTTP Client | Axios |
| Backend API | FastAPI (Python) |
| AI Engine | Hugging Face Router API — Qwen/Qwen2.5-7B-Instruct |
| PDF Parsing | PyPDF2 |
| Containerization | Docker Compose (frontend only) |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend (Vite)               │
│  - PDF upload → /api/analyze                        │
│  - Risk dashboard (score, matrix, drill-down cards) │
│  - RAG chat interface → /api/chat                   │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP (localhost:8000)
┌───────────────────▼─────────────────────────────────┐
│              FastAPI Backend (main.py)               │
│  POST /api/analyze  — PDF upload & risk extraction  │
│  POST /api/chat     — Q&A against document text     │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│           RiskAnalyzerEngine (risk_engine.py)        │
│  - PyPDF2 text extraction                           │
│  - Structured JSON risk analysis prompt             │
│  - Free-form document Q&A                           │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────────┐
│     Hugging Face Router API (Qwen2.5-7B-Instruct)   │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

- Python 3.9+
- Node.js (for running frontend outside Docker)
- Docker + Docker Compose (for containerized frontend)
- A Hugging Face fine-grained API token with inference access

## Configuration

Open `risk_engine.py` and replace the token value:

```python
HF_TOKEN = "your_huggingface_token_here"
```

## How to Run Locally

Install Python dependencies:

```bash
pip install fastapi uvicorn PyPDF2 requests pydantic
```

Then start both services with these two commands:

**1. Start the React frontend (Docker):**
```bash
docker compose up
```

**2. Start the FastAPI backend:**
```bash
uvicorn main:app --reload
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:8000`.

## API Endpoints

`POST /api/analyze` — accepts a PDF file upload, returns the structured risk analysis JSON and the extracted document text.

`POST /api/chat` — accepts `document_text` and `question` fields, returns a concise answer grounded in the document.

## Risk Analysis Output Schema

```json
{
  "ExecutiveSummary": "...",
  "OverallRiskScore": 72,
  "IdentifiedRisks": [
    {
      "RiskName": "...",
      "Category": "...",
      "Probability": 8,
      "Impact": 7,
      "Description": "...",
      "AffectedDepartments": ["Engineering", "PMO"],
      "RecommendedAction": "..."
    }
  ]
}
```
