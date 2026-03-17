# Responsible & Frugal AI — Edge Risk

> This document discloses all AI components used in Edge Risk, the guardrails implemented, model selection rationale, and cost controls. Written in compliance with the Master's evaluation rubric for GenAI PoC submissions.

---

## 1. AI Components Inventory

| Component | Model ID | Provider | Trigger | Output Type |
|---|---|---|---|---|
| Risk Extraction | `Qwen/Qwen2.5-7B-Instruct` | Hugging Face Router API | PDF upload | Structured JSON |
| RAG Chat | `Qwen/Qwen2.5-7B-Instruct` | Hugging Face Router API | User chat message | Free-form text (markdown) |

**No other AI systems, embeddings, vector databases, or third-party AI APIs are used.**

---

## 2. Model Selection — Frugal AI Rationale

### Why Qwen 2.5-7B-Instruct?

| Criterion | 7B Choice | Alternative (70B) | Decision |
|---|---|---|---|
| Cost per 1M tokens | ~$0.07 (HF free tier) | ~$0.90 | ✅ 7B wins |
| Latency (avg) | 5–12 seconds | 30–60 seconds | ✅ 7B wins |
| JSON instruction following | Strong at 7B scale | Marginally better | ✅ 7B sufficient |
| Context window | 32K tokens | 32K tokens | Tie |
| PoC suitability | Fully adequate | Overkill | ✅ 7B wins |

**Conclusion:** For structured extraction from short documents (≤1500 chars), a 7B instruction-tuned model delivers equivalent output quality at a fraction of the cost and latency. Scaling to a larger model is a future option if extraction quality degrades on complex documents.

### Why Qwen over GPT-4 / Claude?

- **Data residency:** Hugging Face Router API can be self-hosted; OpenAI/Anthropic send data to US servers with no opt-out for free tiers.
- **Cost:** Qwen 2.5 is available on HF free inference tier; GPT-4o costs ~$5/1M output tokens.
- **Transparency:** Qwen is an open-weight model with a published model card and training disclosure.

---

## 3. Guardrails

### 3.1 Grounding (Hallucination Prevention)

The RAG chat system prompt explicitly instructs the model to answer **only from the provided context**:

```python
"You are an expert risk analyst assistant. Answer the user's question using the provided context...
If the answer is not in the context, say 'I cannot find this in the document.'"
```

The context passed to the model is always bounded:
- Raw document text: capped at **1500 characters**
- Structured analysis JSON: capped at **2000 characters**

This prevents the model from drawing on its parametric knowledge to fabricate project-specific details.

### 3.2 Structured Output Enforcement

The risk extraction prompt uses a **strict JSON schema** with explicit field names and types:

```python
"You MUST respond ONLY with a valid JSON object. Do not add markdown, greetings, or extra text."
```

A **regex post-processor** (`re.search(r'\{[\s\S]*\}', raw_response)`) extracts the JSON block even if the model wraps it in markdown fences, making parsing robust against minor instruction drift.

### 3.3 Prompt Injection Defenses

| Attack Vector | Defense |
|---|---|
| Malicious PDF content trying to override system prompt | Document text is injected as a **user-role message**, not system prompt. System prompt is hardcoded and not user-controllable. |
| User chat input trying to override instructions | Chat question is appended after the context block, not before. System prompt is always the first message. |
| Jailbreak via role-play instructions in PDF | Model temperature set to **0.2 (extraction)** and **0.3 (chat)** — low temperature reduces creative deviation from instructions. |

### 3.4 Input Validation

- Backend validates file extension: only `.pdf` files accepted (`if not file.filename.endswith('.pdf')`)
- Document text is truncated before being sent to the API — no unbounded input
- API responses are validated: if JSON parsing fails, a safe error dict is returned instead of crashing

### 3.5 Output Sanitization

- AI-generated text is rendered via a custom `formatMessage()` React function that only processes `**bold**`, bullet lists, and numbered lists — no `dangerouslySetInnerHTML`, no raw HTML injection from AI output.

---

## 4. Evaluation & Observability

### 4.1 Logging

The backend logs every AI call at `INFO` level:

```python
logger.info(f"Raw AI Output: \n{raw_response}")
logger.error(f"HF API Rejected: {error_msg}")
```

This provides a full audit trail of model inputs and outputs during development and demo.

### 4.2 Failure Modes

| Failure | Handling |
|---|---|
| HF API returns non-200 | Error dict returned to frontend with status code and message |
| JSON not found in response | Safe fallback: `{"Error": {"Description": "AI failed to format JSON."}}` |
| Network timeout (>120s) | `requests.post(..., timeout=120)` — exception caught, user-friendly error returned |
| Empty PDF | `extract_text()` returns `None`; downstream functions handle gracefully |

### 4.3 Known Limitations (Honest Disclosure)

- **Context truncation:** Only the first 1500 characters of a PDF are analyzed. Long documents may have risks in later sections that are missed.
- **No evaluation dataset:** There is no automated test suite validating extraction quality against a labeled benchmark. This is a PoC limitation.
- **Single-turn extraction:** The analysis prompt is stateless — it does not learn from previous analyses or user corrections.
- **No PII detection:** The system does not scan for or redact PII in uploaded documents before sending to the inference API.

---

## 5. Cost Controls

| Control | Implementation |
|---|---|
| Token cap on extraction | `"max_tokens": 1500` in analysis payload |
| Token cap on chat | `"max_tokens": 400` in chat payload |
| Text truncation before API call | `document_text[:1500]` and `analysis_json[:2000]` |
| Single model for both tasks | One model ID reused for extraction and chat — no multi-model cost multiplication |
| HF free inference tier | No paid API subscription required for PoC demonstration |

**Estimated cost per analysis:** < $0.001 on paid tier. Free tier: $0.00.

---

## 6. Responsible AI Checklist

| Principle | Status | Notes |
|---|---|---|
| Transparency | ✅ | Model, provider, and prompts fully disclosed in this document |
| Grounding | ✅ | Chat answers bounded to document context |
| Hallucination mitigation | ✅ | Low temperature + explicit "say I don't know" instruction |
| Prompt injection defense | ✅ | User input never reaches system prompt |
| Output safety | ✅ | No raw HTML rendering of AI output |
| Data minimization | ✅ | Only first 1500 chars sent to external API |
| Cost efficiency | ✅ | 7B model, token caps, free tier |
| Human oversight | ⚠️ | No human-in-the-loop review before results are shown — PoC limitation |
| Bias assessment | ⚠️ | No bias audit conducted on risk categorization outputs — future work |
| PII handling | ⚠️ | No PII redaction before API call — see SECURITY.md |
