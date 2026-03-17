from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json

# Import your new database architecture
import models
import database
from database import get_db

# Import your working AI engine
from risk_engine import RiskAnalyzerEngine

app = FastAPI()

# THIS IS THE MAGIC LINE: It creates the tables in your local enterprise_risk.db file
models.Base.metadata.create_all(bind=database.engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the AI Engine once
ai_engine = RiskAnalyzerEngine()

# ---------------------------------------------------------
# ENDPOINT 1: Get all projects for the React Sidebar
# ---------------------------------------------------------
@app.get("/api/projects")
def get_all_projects(db: Session = Depends(get_db)):
    projects = db.query(models.Project).order_by(models.Project.created_at.desc()).all()
    return [{"id": p.id, "name": p.name, "created_at": p.created_at} for p in projects]


# ---------------------------------------------------------
# ENDPOINT 2: Upload a new PDF, run AI, and SAVE to Database
# ---------------------------------------------------------
@app.post("/api/projects")
async def create_project_and_analyze(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    # 1. Check for duplicates first
    existing_project = db.query(models.Project).filter(models.Project.name == file.filename.replace(".pdf", " Analysis")).first()

    # 2. Extract and Analyze (Heavy lifting)
    document_text = ai_engine.extract_text(file.file)
    analysis_result = ai_engine.analyze(document_text)

    if existing_project:
        # UPDATE existing
        doc = db.query(models.Document).filter(models.Document.project_id == existing_project.id).first()
        doc.extracted_text = document_text
        doc.risk_analysis_json = json.dumps(analysis_result)
        db.commit()
        return {"project_id": existing_project.id, "name": existing_project.name, "data": analysis_result}
    
    else:
        # CREATE new
        project_name = file.filename.replace(".pdf", " Analysis")
        new_project = models.Project(name=project_name)
        db.add(new_project)
        db.commit()
        db.refresh(new_project)

        new_doc = models.Document(
            project_id=new_project.id,
            filename=file.filename,
            extracted_text=document_text,
            risk_analysis_json=json.dumps(analysis_result)
        )
        db.add(new_doc)
        db.commit()
        return {"project_id": new_project.id, "name": new_project.name, "data": analysis_result}


# ---------------------------------------------------------
# ENDPOINT 3: Instantly load an old project dashboard
# ---------------------------------------------------------
@app.get("/api/projects/{project_id}")
def get_project_dashboard(project_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.project_id == project_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Project data not found")
    
    # Parse the saved string back into a JSON object for React
    return {
        "project_id": project_id,
        "data": json.loads(doc.risk_analysis_json),
        "document_text": doc.extracted_text
    }

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


# 1. Get Chat History for a project
@app.get("/api/projects/{project_id}/chat")
def get_chat_history(project_id: int, db: Session = Depends(get_db)):
    chats = db.query(models.ChatMessage).filter(models.ChatMessage.project_id == project_id).order_by(models.ChatMessage.timestamp.asc()).all()
    return [{"role": c.role, "text": c.text} for c in chats]

# 2. Send a new message and save it
@app.post("/api/projects/{project_id}/chat")
async def chat_with_project(project_id: int, payload: dict, db: Session = Depends(get_db)):
    question = payload.get("question")
    doc_text = payload.get("document_text", "")
    analysis_json = payload.get("analysis_json", "")

    # Save User Message to DB
    user_msg = models.ChatMessage(project_id=project_id, role="user", text=question)
    db.add(user_msg)
    
    # Get AI Answer from Engine (pass both raw text and structured analysis)
    answer = ai_engine.ask_question(doc_text, question, analysis_json)
    
    # Save AI Answer to DB
    ai_msg = models.ChatMessage(project_id=project_id, role="ai", text=answer)
    db.add(ai_msg)
    
    db.commit()
    return {"role": "ai", "text": answer}