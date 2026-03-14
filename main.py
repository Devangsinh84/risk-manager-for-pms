from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from risk_engine import RiskAnalyzerEngine
import io

# Initialize the API and the AI Engine
app = FastAPI(title="Risk Analyzer API")
engine = RiskAnalyzerEngine()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW: Data model for the React chat request ---
class ChatRequest(BaseModel):
    document_text: str
    question: str

@app.post("/api/analyze")
async def analyze_document(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        
        document_text = engine.extract_text(pdf_file)
        if not document_text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")
            
        analysis_dict = engine.analyze(document_text)
        
        # --- UPDATED: Return the document_text to React so it can remember it for the chat ---
        return {
            "status": "success", 
            "data": analysis_dict,
            "document_text": document_text
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW: Chat Endpoint ---
@app.post("/api/chat")
async def chat_with_document(request: ChatRequest):
    try:
        # Calls the ask_question method we built earlier in risk_engine.py
        answer = engine.ask_question(request.document_text, request.question)
        return {"status": "success", "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))