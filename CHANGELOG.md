# Changelog — Edge Risk

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [v1.0.0] — 2026-03-17 🏷️ Tagged Release

> **Final Master's submission build. Feature-complete PoC.**

### Added
- **Dual Theme System** — Dark (default) and Light mode with a ☀️/🌙 toggle button in the sidebar header. All colors use CSS custom properties (`var(--text-primary)` etc.) so the entire UI switches in a single `data-theme` attribute change with 0.3s smooth transitions.
- **Theme-aware Scatter Chart** — Recharts `CartesianGrid` and axis `stroke` colors now respond to the active theme (dark slate vs. light slate) using the React `theme` state.
- **Improved Chat UI** — Full-height chat window, message bubbles with directional tails, user/AI avatars, animated 3-dot typing indicator, auto-scroll to latest message, custom slim scrollbar, and a polished input bar with focus highlight.
- **Markdown Response Formatting** — Custom `formatMessage()` renderer in React handles `**bold**`, `- bullet lists`, `* bullet lists`, and numbered lists from AI responses without any external dependency.
- **Richer Chat Context** — Chat endpoint now receives both `document_text` and `analysis_json` (the full structured risk output). The AI can now answer questions about the Threat Matrix, risk scores, and mitigations — not just the raw PDF text.
- **Typing Indicator** — `isBotTyping` state shows animated dots while waiting for AI response; Send button disables during this state.
- **Empty Chat State** — Friendly placeholder shown when no messages exist yet, with prompt suggestions.
- **Documentation Suite** — `ARCHITECTURE.md`, `RAI.md`, `SECURITY.md`, `CHANGELOG.md`, `.env.example` added for Master's evaluation rubric compliance.

### Fixed
- **Critical: Empty `document_text` on fresh upload** — `handleUpload` previously never set `documentText` state, causing all chat messages after a fresh upload to send empty context to the backend. Fixed by fetching the full project data (including `document_text`) immediately after upload completes.
- **Critical: Chat had no access to structured analysis** — The AI could not answer questions about the Threat Matrix or risk scores because only raw PDF text was passed. Fixed by passing `analysis_json` alongside `document_text` in the chat payload.
- **Light mode font visibility** — Risk card titles (`#f8fafc`), descriptions (`#94a3b8`), and mitigation text (`#e2e8f0`) were hardcoded dark-theme colors, rendering invisible on white backgrounds. All replaced with CSS variables.
- **Duplicate `renderDashboard` function** — A dead copy of the function existed after `export default App;`, causing lint warnings. Removed.
- **Chat `chatInput` closure bug** — `handleChatSubmit` was reading stale `chatInput` value after `setChatInput("")`. Fixed by capturing `currentInput` before clearing.

### Changed
- `ask_question()` system prompt updated to instruct markdown formatting in responses.
- `ask_question()` `max_tokens` increased from 200 → 400 for more complete answers.
- Chat header and input bar backgrounds switched from hardcoded `rgba(0,0,0,0.2)` to `var(--chat-header-bg)` CSS variable.
- AI message bubble color switched from hardcoded `#e2e8f0` to `var(--text-primary)`.

---

## [v0.3.0] — 2026-03-10

> **Persistence + Archive milestone.**

### Added
- **SQLite Persistence** — Replaced in-memory state with SQLAlchemy ORM. Projects, documents, and chat messages now survive server restarts.
- **Project Archive Sidebar** — Lists all past analyses. Click any project to instantly reload its dashboard from the database (no re-analysis needed).
- **Delete Project** — Trash button on each sidebar item with confirmation dialog. Cascades to documents and chat messages.
- **Persistent Chat History** — `ChatMessage` model stores every user and AI message. Chat history reloads when switching back to a project.
- **`GET /api/projects/{id}`** — New endpoint returns saved `risk_analysis_json` and `extracted_text` for instant dashboard reload.
- **`GET /api/projects/{id}/chat`** — Returns full chat history for a project.
- **Duplicate upload handling** — Re-uploading the same filename updates the existing project record instead of creating a duplicate.

### Changed
- `POST /api/projects` now saves analysis result to DB and returns `project_id`.
- Frontend `loadPastProject()` sets both `results` and `documentText` state from the API response.

---

## [v0.2.0] — 2026-03-03

> **RAG Chat milestone.**

### Added
- **Chat RAG Tab** — Second tab on the dashboard. Users can ask free-form questions about the uploaded document.
- **`POST /api/projects/{id}/chat`** endpoint — Accepts `question` and `document_text`, returns grounded AI answer.
- **`ask_question()` method** in `RiskAnalyzerEngine` — Separate prompt for Q&A mode with grounding instruction.
- **Tab navigation** — Analytics / Chat RAG tabs with active state styling.

### Changed
- `RiskAnalyzerEngine` refactored: `analyze()` and `ask_question()` are now separate methods with distinct prompts and token budgets.

---

## [v0.1.0] — 2026-02-24

> **Initial working PoC.**

### Added
- **PDF Upload** — React file picker with drag-friendly label, accepts `.pdf` only.
- **AI Risk Extraction** — `RiskAnalyzerEngine.analyze()` sends document text to Hugging Face Router API (Qwen 2.5-7B-Instruct) and returns structured JSON.
- **Executive Summary card** — Displays 2-sentence project health summary.
- **Overall Risk Score** — Integer 1–100 displayed as large colored stat (red/amber/green threshold).
- **Threat Matrix** — Recharts `ScatterChart` plotting Probability vs. Impact for each identified risk.
- **Risk Drill-down Cards** — Grid of cards showing RiskName, Category badge, Description, and Recommended Mitigation.
- **FastAPI backend** — `POST /api/projects` endpoint for upload and analysis.
- **CORS middleware** — Allows React dev server (port 5173) to call FastAPI (port 8000).
- **Docker Compose** — Containerized React frontend with hot-reload via Vite.
- **Dark theme** — CSS custom properties, Inter font, glass-card components.
- **PDF Export** — html2canvas + jsPDF captures the dashboard as a PDF report.