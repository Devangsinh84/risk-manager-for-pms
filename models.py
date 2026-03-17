from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships to link the tables together
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    chats = relationship("ChatMessage", back_populates="project", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    filename = Column(String)
    extracted_text = Column(Text)
    
    # We will save the massive JSON string here so the dashboard loads instantly!
    risk_analysis_json = Column(Text, nullable=True) 
    
    project = relationship("Project", back_populates="documents")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    role = Column(String) # Will be 'user' or 'ai'
    text = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="chats")